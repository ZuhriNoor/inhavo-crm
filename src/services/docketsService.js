import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { pdf } from '@react-pdf/renderer';
import { DocketPDF } from '../utils/docketPdfTemplate';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import React from 'react';
import { compressImage } from '../utils/imageCompression';
import { loadRemoteImageAsDataUrl, toProxiedUrl } from '../utils/imageUtils';

// Helper to stamp continuous page numbers ("Page X of Y") over all pages of merged PDF
const applyContinuousPageNumbers = async (pdfDoc) => {
  const totalPages = pdfDoc.getPageCount();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const { width } = page.getSize();
    const pageText = `Page ${i + 1} of ${totalPages}`;
    const fontSize = 12;
    const textWidth = fontBold.widthOfTextAtSize(pageText, fontSize);

    const marginRight = 30;
    const marginBottom = 18;
    const xPos = width - textWidth - marginRight;
    const yPos = marginBottom;

    // Solid white mask to cover existing page numbers / background content cleanly
    page.drawRectangle({
      x: xPos - 6,
      y: yPos - 4,
      width: textWidth + 12,
      height: fontSize + 8,
      color: rgb(1, 1, 1),
    });

    // Stamp continuous page number
    page.drawText(pageText, {
      x: xPos,
      y: yPos,
      size: fontSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }

  return await pdfDoc.save();
};

const DOCKETS_COL = 'dockets';
const TEMPLATES_COL = 'docketTemplates';

export const getDocketsBySaleOrder = async (salesOrderId) => {
  const q = query(
    collection(db, DOCKETS_COL),
    where('salesOrderId', '==', salesOrderId),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Helper for file uploads
const uploadFile = async (file, path, compress = false) => {
  if (!file) return null;
  
  let fileToUpload = file;
  if (compress && file.type?.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file);
    } catch (err) {
      console.warn('Image compression failed, uploading original', err);
    }
  }

  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, fileToUpload);
  return await getDownloadURL(fileRef);
};

// Helper for processing and uploading docket images & PDFs to Firebase Storage
const processDocketImages = async (docketData, docketNumber, timestamp) => {
  let generalImageUrl = docketData.generalImageUrl || null;

  // 1. General Image
  if (docketData.generalImageFile) {
    generalImageUrl = await uploadFile(
      docketData.generalImageFile,
      `dockets/images/${docketNumber}/general_${timestamp}.jpg`,
      true
    );
  } else if (generalImageUrl && generalImageUrl.startsWith('blob:')) {
    try {
      const res = await fetch(generalImageUrl);
      const blob = await res.blob();
      generalImageUrl = await uploadFile(
        blob,
        `dockets/images/${docketNumber}/general_${timestamp}.jpg`,
        true
      );
    } catch (e) {
      console.warn('Failed to upload general image blob URL:', e);
    }
  }

  // 2. Dynamic Field Images
  const dynamicFields = await Promise.all(
    (docketData.dynamicFields || []).map(async (field) => {
      let imageUrl = field.imageUrl || null;
      if (field.imageFile) {
        imageUrl = await uploadFile(
          field.imageFile,
          `dockets/images/${docketNumber}/field_${field.key}_${timestamp}.jpg`,
          true
        );
      } else if (imageUrl && imageUrl.startsWith('blob:')) {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          imageUrl = await uploadFile(
            blob,
            `dockets/images/${docketNumber}/field_${field.key}_${timestamp}.jpg`,
            true
          );
        } catch (e) {
          console.warn(`Failed to upload field ${field.key} image blob URL:`, e);
        }
      }
      const { imageFile, ...restField } = field;
      return {
        ...restField,
        imageUrl: imageUrl && !imageUrl.startsWith('blob:') ? imageUrl : null,
      };
    })
  );

  // 3. Additional Images & PDFs from additionalFiles
  const extraImageUrls = [];
  const extraPdfUrls = [];

  if (docketData.additionalFiles) {
    for (let i = 0; i < docketData.additionalFiles.length; i++) {
      const file = docketData.additionalFiles[i];
      const isPdf = file.type?.toLowerCase().includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
      if (!isPdf && (file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name))) {
        const uploadedUrl = await uploadFile(
          file,
          `dockets/images/${docketNumber}/extra_${i}_${timestamp}.jpg`,
          true
        );
        if (uploadedUrl) extraImageUrls.push(uploadedUrl);
      } else if (isPdf) {
        const uploadedUrl = await uploadFile(
          file,
          `dockets/pdfs/${docketNumber}/extra_pdf_${i}_${timestamp}.pdf`,
          false
        );
        if (uploadedUrl) {
          extraPdfUrls.push({ name: file.name, url: uploadedUrl });
        }
      }
    }
  }

  // Preserve existing remote extraImageUrls if editing
  if (docketData.extraImageUrls) {
    for (const url of docketData.extraImageUrls) {
      if (url && !url.startsWith('blob:')) {
        extraImageUrls.push(url);
      }
    }
  }

  // Preserve existing remote extraPdfUrls if editing
  if (docketData.existingExtraPdfUrls) {
    for (const item of docketData.existingExtraPdfUrls) {
      if (item) {
        if (typeof item === 'string' && !item.startsWith('blob:')) {
          extraPdfUrls.push({ name: 'Attachment.pdf', url: item });
        } else if (typeof item === 'object' && item.url && !item.url.startsWith('blob:')) {
          extraPdfUrls.push(item);
        }
      }
    }
  }

  return {
    generalImageUrl: generalImageUrl && !generalImageUrl.startsWith('blob:') ? generalImageUrl : null,
    dynamicFields,
    extraImageUrls,
    extraPdfUrls,
  };
};

const prepareDocketForPdf = async (docket) => {
  try {
    const [generalDataUrl, dynamicFieldsDataUrls, extraDataUrls] = await Promise.all([
      loadRemoteImageAsDataUrl(docket.generalImageUrl),
      Promise.all(
        (docket.dynamicFields || []).map(async (f) => ({
          ...f,
          imageUrl: await loadRemoteImageAsDataUrl(f.imageUrl)
        }))
      ),
      Promise.all(
        (docket.extraImageUrls || []).map((url) => loadRemoteImageAsDataUrl(url))
      )
    ]);

    return {
      ...docket,
      generalImageUrl: generalDataUrl,
      dynamicFields: dynamicFieldsDataUrls,
      extraImageUrls: extraDataUrls.filter(Boolean)
    };
  } catch (err) {
    console.warn('Failed to prepare docket image data URLs for PDF:', err);
    return docket;
  }
};

export const createDocket = async (docketData) => {
  // First get the sequential docket number via transaction
  const docketNumData = await runTransaction(db, async (transaction) => {
    const counterRef = doc(db, 'counters', 'docketCounters');
    const counterDoc = await transaction.get(counterRef);
    
    const soBase = docketData.salesOrderNumber || 'SO';
    let nextCount = 1;
    if (counterDoc.exists() && counterDoc.data()[soBase]) {
      nextCount = counterDoc.data()[soBase] + 1;
    }
    const docketNumber = `DOC-${soBase}-${String(nextCount).padStart(2, '0')}`;
    transaction.set(counterRef, { [soBase]: nextCount }, { merge: true });
    return { docketNumber };
  });

  const { docketNumber } = docketNumData;
  const timestamp = Date.now();

  // 1. Upload images & extra PDFs to Firebase Storage
  const { generalImageUrl, dynamicFields, extraImageUrls, extraPdfUrls } = await processDocketImages(
    docketData,
    docketNumber,
    timestamp
  );

  // Separate newly added local PDF files
  const localExtraPdfs = [];
  if (docketData.additionalFiles) {
    for (let i = 0; i < docketData.additionalFiles.length; i++) {
      const file = docketData.additionalFiles[i];
      if (file.type?.toLowerCase().includes('pdf') || file.name?.toLowerCase().endsWith('.pdf')) {
        localExtraPdfs.push(file);
      }
    }
  }

  // Construct final docket payload (with permanent Firebase Storage URLs)
  const finalDocket = {
    salesOrderId: docketData.salesOrderId,
    salesOrderNumber: docketData.salesOrderNumber,
    customerDetails: docketData.customerDetails,
    productDetails: docketData.productDetails,
    templateId: docketData.templateId,
    templateName: docketData.templateName,
    generalDescription: docketData.generalDescription,
    deliveryDate: docketData.deliveryDate || '',
    storeAddress: docketData.storeAddress || '',
    generalImageUrl,
    dynamicFields,
    extraImageUrls,
    extraPdfUrls,
    docketNumber,
    productionStatus: 'Pending',
    createdAt: serverTimestamp(),
  };

  // 2. Generate the base PDF using @react-pdf/renderer
  const pdfDocket = await prepareDocketForPdf(finalDocket);
  const basePdfBlob = await pdf(React.createElement(DocketPDF, { docket: pdfDocket })).toBlob();
  const basePdfArrayBuffer = await basePdfBlob.arrayBuffer();

  // 3. Load PDF ArrayBuffers for all extra PDFs (newly added local files + existing remote PDF URLs)
  const extraPdfBuffers = [];
  for (const file of localExtraPdfs) {
    try {
      const buf = await file.arrayBuffer();
      extraPdfBuffers.push(buf);
    } catch (err) {
      console.error('Failed to read local PDF buffer:', file.name, err);
    }
  }

  if (docketData.existingExtraPdfUrls) {
    for (const item of docketData.existingExtraPdfUrls) {
      const url = typeof item === 'object' ? item.url : item;
      if (url && !url.startsWith('blob:')) {
        try {
          const fetchUrl = toProxiedUrl(url);
          const res = await fetch(fetchUrl);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            extraPdfBuffers.push(buf);
          }
        } catch (err) {
          console.error('Failed to download existing extra PDF from Storage:', url, err);
        }
      }
    }
  }

  // 4. Merge all PDF buffers into base PDF
  const mergedPdf = await PDFDocument.load(basePdfArrayBuffer);
  for (const pdfBuf of extraPdfBuffers) {
    try {
      const extraPdfDoc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(extraPdfDoc, extraPdfDoc.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    } catch (err) {
      console.error('Failed to merge extra PDF buffer:', err);
    }
  }
  const finalPdfBytes = await applyContinuousPageNumbers(mergedPdf);

  // 5. Upload final PDF to Firebase Storage
  const pdfBlobToUpload = new Blob([finalPdfBytes], { type: 'application/pdf' });
  const finalPdfUrl = await uploadFile(pdfBlobToUpload, `dockets/pdfs/${docketNumber}-${timestamp}.pdf`);
  
  // 6. Save docket object with images, PDF attachments, and PDF URL to Firestore
  const firestoreDocket = { ...finalDocket, pdfUrl: finalPdfUrl };
  const newDocketRef = await addDoc(collection(db, DOCKETS_COL), firestoreDocket);
  
  return { id: newDocketRef.id, ...firestoreDocket };
};

export const updateDocket = async (id, data) => {
  await updateDoc(doc(db, DOCKETS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const updateDocketWithFiles = async (id, docketData) => {
  const { docketNumber } = docketData;
  const timestamp = Date.now();

  const { generalImageUrl, dynamicFields, extraImageUrls, extraPdfUrls } = await processDocketImages(
    docketData,
    docketNumber,
    timestamp
  );

  const localExtraPdfs = [];
  if (docketData.additionalFiles) {
    for (let i = 0; i < docketData.additionalFiles.length; i++) {
      const file = docketData.additionalFiles[i];
      if (file.type?.toLowerCase().includes('pdf') || file.name?.toLowerCase().endsWith('.pdf')) {
        localExtraPdfs.push(file);
      }
    }
  }

  const finalDocket = {
    salesOrderId: docketData.salesOrderId,
    salesOrderNumber: docketData.salesOrderNumber,
    customerDetails: docketData.customerDetails,
    productDetails: docketData.productDetails,
    templateId: docketData.templateId,
    templateName: docketData.templateName,
    generalDescription: docketData.generalDescription,
    deliveryDate: docketData.deliveryDate || '',
    storeAddress: docketData.storeAddress || '',
    generalImageUrl,
    dynamicFields,
    extraImageUrls,
    extraPdfUrls,
    docketNumber,
    productionStatus: docketData.productionStatus || 'Pending',
    updatedAt: serverTimestamp(),
  };

  const pdfDocket = await prepareDocketForPdf(finalDocket);
  const basePdfBlob = await pdf(React.createElement(DocketPDF, { docket: pdfDocket })).toBlob();
  const basePdfArrayBuffer = await basePdfBlob.arrayBuffer();

  const extraPdfBuffers = [];
  for (const file of localExtraPdfs) {
    try {
      const buf = await file.arrayBuffer();
      extraPdfBuffers.push(buf);
    } catch (err) {
      console.error('Failed to read local PDF buffer:', file.name, err);
    }
  }

  if (docketData.existingExtraPdfUrls) {
    for (const item of docketData.existingExtraPdfUrls) {
      const url = typeof item === 'object' ? item.url : item;
      if (url && !url.startsWith('blob:')) {
        try {
          const fetchUrl = toProxiedUrl(url);
          const res = await fetch(fetchUrl);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            extraPdfBuffers.push(buf);
          }
        } catch (err) {
          console.error('Failed to download existing extra PDF from Storage:', url, err);
        }
      }
    }
  }

  const mergedPdf = await PDFDocument.load(basePdfArrayBuffer);
  for (const pdfBuf of extraPdfBuffers) {
    try {
      const extraPdfDoc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(extraPdfDoc, extraPdfDoc.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    } catch (err) {
      console.error('Failed to merge extra PDF buffer:', err);
    }
  }
  const finalPdfBytes = await applyContinuousPageNumbers(mergedPdf);

  const pdfBlobToUpload = new Blob([finalPdfBytes], { type: 'application/pdf' });
  const finalPdfUrl = await uploadFile(pdfBlobToUpload, `dockets/pdfs/${docketNumber}-${timestamp}.pdf`);
  
  const firestoreDocket = { ...finalDocket, pdfUrl: finalPdfUrl };

  await updateDoc(doc(db, DOCKETS_COL, id), firestoreDocket);
  
  return { id, ...firestoreDocket };
};

export const getDocketTemplates = async () => {
  const snap = await getDocs(collection(db, TEMPLATES_COL));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createDocketTemplate = async (templateData) => {
  const docRef = await addDoc(collection(db, TEMPLATES_COL), templateData);
  return docRef.id;
};

export const updateDocketTemplate = async (id, data) => {
  await updateDoc(doc(db, TEMPLATES_COL, id), data);
};

export const deleteDocketTemplate = async (id) => {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, TEMPLATES_COL, id));
};

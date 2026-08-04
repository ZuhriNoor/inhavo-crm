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
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import React from 'react';
import { compressImage } from '../utils/imageCompression';
import { getStoreCodeAndNextSeq } from '../utils/sequenceUtils';
import { loadRemoteImageAsDataUrl, toProxiedUrl } from '../utils/imageUtils';

const stampRotatedText = (page, {
  text,
  font,
  fontSize,
  textColor,
  bgColor,
  borderColor,
  W,
  H,
  rot,
  visualPos,
  marginV,
  marginH,
  textWidth,
}) => {
  const padX = 10;
  const padY = 5;

  const W_vis = (rot === 90 || rot === 270) ? H : W;
  const H_vis = (rot === 90 || rot === 270) ? W : H;

  let xv = 0;
  let yv = 0;

  if (visualPos === 'bottom-right') {
    xv = W_vis - textWidth - marginH;
    yv = marginV;
  } else if (visualPos === 'top-center') {
    xv = (W_vis - textWidth) / 2;
    yv = H_vis - marginV - fontSize;
  } else if (visualPos === 'top-left') {
    xv = marginH;
    yv = H_vis - marginV - fontSize;
  }

  const rect_xv = xv - padX;
  const rect_yv = yv - padY;
  const rectW_vis = textWidth + padX * 2;
  const rectH_vis = fontSize + padY * 2;

  let x = 0, y = 0, rectX = 0, rectY = 0;

  if (rot === 0) {
    x = xv;
    y = yv;
    rectX = rect_xv;
    rectY = rect_yv;
  } else if (rot === 90) {
    x = W - yv;
    y = xv;
    rectX = W - rect_yv;
    rectY = rect_xv;
  } else if (rot === 180) {
    x = W - xv;
    y = H - yv;
    rectX = W - rect_xv;
    rectY = H - rect_yv;
  } else if (rot === 270) {
    x = yv;
    y = H - xv;
    rectX = rect_yv;
    rectY = H - rect_xv;
  }

  if (bgColor) {
    page.drawRectangle({
      x: rectX,
      y: rectY,
      width: rectW_vis,
      height: rectH_vis,
      color: bgColor,
      borderColor: borderColor || undefined,
      borderWidth: borderColor ? 1 : 0,
      rotate: degrees(rot),
    });
  }

  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: textColor,
    rotate: degrees(rot),
  });
};

// Helper to stamp continuous page numbers ("Page X of Y") & attachment titles over all pages of merged PDF
const applyContinuousPageNumbers = async (pdfDoc, attachmentTitlesMap = new Map()) => {
  const totalPages = pdfDoc.getPageCount();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const { width: W, height: H } = page.getSize();
    const rot = (page.getRotation().angle % 360 + 360) % 360;

    // 1. Stamp Attachment Title at visual top-center (if this page belongs to an attached PDF)
    const attachmentTitle = attachmentTitlesMap.get(i);
    if (attachmentTitle) {
      const titleText = `ATTACHMENT: ${attachmentTitle.toUpperCase()}`;
      const titleFontSize = 13;
      const titleWidth = fontBold.widthOfTextAtSize(titleText, titleFontSize);

      stampRotatedText(page, {
        text: titleText,
        font: fontBold,
        fontSize: titleFontSize,
        textColor: rgb(0.435, 0.306, 0.216), // Brand Brown (#6F4E37)
        bgColor: rgb(1, 1, 1),
        borderColor: rgb(0.7, 0.7, 0.7),
        W,
        H,
        rot,
        visualPos: 'top-center',
        marginV: 18,
        marginH: 25,
        textWidth: titleWidth,
      });
    }

    // 2. Stamp Continuous Page Number ("Page X of Y") at visual bottom-right
    const pageText = `Page ${i + 1} of ${totalPages}`;
    const fontSize = 11;
    const textWidth = fontBold.widthOfTextAtSize(pageText, fontSize);

    stampRotatedText(page, {
      text: pageText,
      font: fontBold,
      fontSize,
      textColor: rgb(0, 0, 0),
      bgColor: rgb(1, 1, 1),
      borderColor: null,
      W,
      H,
      rot,
      visualPos: 'bottom-right',
      marginV: 16,
      marginH: 25,
      textWidth,
    });
  }

  return await pdfDoc.save();
};

const DOCKETS_COL = 'dockets';
const TEMPLATES_COL = 'docketTemplates';

export const getDocketsBySaleOrder = async (salesOrderId, storeId = null) => {
  try {
    const constraints = [where('salesOrderId', '==', salesOrderId)];
    if (storeId) constraints.push(where('storeId', '==', storeId));
    
    const q = query(
      collection(db, DOCKETS_COL),
      ...constraints,
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching dockets for sales order:', error);
    if (error?.message?.includes('index')) {
      alert('Firebase requires a new index to fetch Dockets. Please click the link in the console to create it.');
    }
    return [];
  }
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
      const fileObj = docketData.additionalFiles[i];
      const file = fileObj.file || fileObj;
      const title = fileObj.title || file.name?.replace(/\.pdf$/i, '') || 'Attachment PDF';
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
          extraPdfUrls.push({ name: title, url: uploadedUrl });
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
          extraPdfUrls.push({ name: 'Attachment PDF', url: item });
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
    const { refNumber: docketNumber } = await getStoreCodeAndNextSeq(
      transaction,
      counterRef,
      docketData.storeId,
      'DOC-'
    );
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
  const extraPdfItems = [];

  if (docketData.additionalFiles) {
    for (const fileObj of docketData.additionalFiles) {
      const file = fileObj.file || fileObj;
      if (file.type?.toLowerCase().includes('pdf') || file.name?.toLowerCase().endsWith('.pdf')) {
        try {
          const title = fileObj.title || file.name?.replace(/\.pdf$/i, '') || 'Attached PDF';
          const buf = await file.arrayBuffer();
          extraPdfItems.push({ title, buffer: buf });
        } catch (err) {
          console.error('Failed to read local PDF buffer:', file.name, err);
        }
      }
    }
  }

  if (docketData.existingExtraPdfUrls) {
    for (const item of docketData.existingExtraPdfUrls) {
      const url = typeof item === 'object' ? item.url : item;
      const title = (typeof item === 'object' ? item.name : '') || 'Attachment PDF';
      if (url && !url.startsWith('blob:')) {
        try {
          const fetchUrl = toProxiedUrl(url);
          const res = await fetch(fetchUrl);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            extraPdfItems.push({ title, buffer: buf });
          }
        } catch (err) {
          console.error('Failed to download existing extra PDF from Storage:', url, err);
        }
      }
    }
  }

  // 4. Merge all PDF buffers into base PDF
  const mergedPdf = await PDFDocument.load(basePdfArrayBuffer);
  const attachmentTitlesMap = new Map();

  for (const pdfItem of extraPdfItems) {
    try {
      const extraPdfDoc = await PDFDocument.load(pdfItem.buffer, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(extraPdfDoc, extraPdfDoc.getPageIndices());
      copiedPages.forEach(page => {
        mergedPdf.addPage(page);
        const pageIdx = mergedPdf.getPageCount() - 1;
        if (pdfItem.title) {
          attachmentTitlesMap.set(pageIdx, pdfItem.title);
        }
      });
    } catch (err) {
      console.error('Failed to merge extra PDF buffer:', err);
    }
  }
  const finalPdfBytes = await applyContinuousPageNumbers(mergedPdf, attachmentTitlesMap);

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

  const extraPdfItems = [];

  if (docketData.additionalFiles) {
    for (const fileObj of docketData.additionalFiles) {
      const file = fileObj.file || fileObj;
      if (file.type?.toLowerCase().includes('pdf') || file.name?.toLowerCase().endsWith('.pdf')) {
        try {
          const title = fileObj.title || file.name?.replace(/\.pdf$/i, '') || 'Attached PDF';
          const buf = await file.arrayBuffer();
          extraPdfItems.push({ title, buffer: buf });
        } catch (err) {
          console.error('Failed to read local PDF buffer:', file.name, err);
        }
      }
    }
  }

  if (docketData.existingExtraPdfUrls) {
    for (const item of docketData.existingExtraPdfUrls) {
      const url = typeof item === 'object' ? item.url : item;
      const title = (typeof item === 'object' ? item.name : '') || 'Attachment PDF';
      if (url && !url.startsWith('blob:')) {
        try {
          const fetchUrl = toProxiedUrl(url);
          const res = await fetch(fetchUrl);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            extraPdfItems.push({ title, buffer: buf });
          }
        } catch (err) {
          console.error('Failed to download existing extra PDF from Storage:', url, err);
        }
      }
    }
  }

  const mergedPdf = await PDFDocument.load(basePdfArrayBuffer);
  const attachmentTitlesMap = new Map();

  for (const pdfItem of extraPdfItems) {
    try {
      const extraPdfDoc = await PDFDocument.load(pdfItem.buffer, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(extraPdfDoc, extraPdfDoc.getPageIndices());
      copiedPages.forEach(page => {
        mergedPdf.addPage(page);
        const pageIdx = mergedPdf.getPageCount() - 1;
        if (pdfItem.title) {
          attachmentTitlesMap.set(pageIdx, pdfItem.title);
        }
      });
    } catch (err) {
      console.error('Failed to merge extra PDF buffer:', err);
    }
  }
  const finalPdfBytes = await applyContinuousPageNumbers(mergedPdf, attachmentTitlesMap);

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

export const getAllDockets = async (storeId) => {
  let q;
  if (storeId) {
    q = query(
      collection(db, DOCKETS_COL),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(collection(db, DOCKETS_COL), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteDocketTemplate = async (id) => {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, TEMPLATES_COL, id));
};

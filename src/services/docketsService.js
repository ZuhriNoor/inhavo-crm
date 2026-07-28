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
import { PDFDocument } from 'pdf-lib';
import React from 'react';
import { compressImage } from '../utils/imageCompression';
import { loadRemoteImageAsDataUrl } from '../utils/imageUtils';

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
  if (compress && file.type.startsWith('image/')) {
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

// Helper for processing and uploading docket images to Firebase Storage
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

  // 3. Additional Images from additionalFiles
  const extraImageUrls = [];
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
      }
    }
  }

  // Keep existing remote extraImageUrls if editing
  if (docketData.extraImageUrls) {
    for (const url of docketData.extraImageUrls) {
      if (url && !url.startsWith('blob:')) {
        extraImageUrls.push(url);
      }
    }
  }

  return {
    generalImageUrl: generalImageUrl && !generalImageUrl.startsWith('blob:') ? generalImageUrl : null,
    dynamicFields,
    extraImageUrls,
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

  // 1. Upload images to Firebase Storage
  const { generalImageUrl, dynamicFields, extraImageUrls } = await processDocketImages(
    docketData,
    docketNumber,
    timestamp
  );

  // 2. Separate Extra PDFs
  const extraPdfs = [];
  if (docketData.additionalFiles) {
    for (let i = 0; i < docketData.additionalFiles.length; i++) {
      const file = docketData.additionalFiles[i];
      if (file.type?.toLowerCase().includes('pdf') || file.name?.toLowerCase().endsWith('.pdf')) {
        extraPdfs.push(file);
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
    storeAddress: docketData.storeAddress || '',
    generalImageUrl,
    dynamicFields,
    extraImageUrls,
    extraPdfCount: extraPdfs.length,
    docketNumber,
    productionStatus: 'Pending',
    createdAt: serverTimestamp(),
  };

  // 3. Generate the base PDF using @react-pdf/renderer
  const pdfDocket = await prepareDocketForPdf(finalDocket);
  const basePdfBlob = await pdf(React.createElement(DocketPDF, { docket: pdfDocket })).toBlob();
  const basePdfArrayBuffer = await basePdfBlob.arrayBuffer();

  // 4. Merge with extra PDFs using pdf-lib
  let finalPdfBytes;
  if (extraPdfs.length > 0) {
    const mergedPdf = await PDFDocument.load(basePdfArrayBuffer);
    for (const extraPdfFile of extraPdfs) {
      try {
        const extraPdfBuffer = await extraPdfFile.arrayBuffer();
        const extraPdf = await PDFDocument.load(extraPdfBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(extraPdf, extraPdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      } catch (err) {
        console.error('Failed to merge extra PDF:', extraPdfFile.name, err);
      }
    }
    finalPdfBytes = await mergedPdf.save();
  } else {
    finalPdfBytes = basePdfArrayBuffer;
  }

  // 5. Upload final PDF to Firebase Storage
  const pdfBlobToUpload = new Blob([finalPdfBytes], { type: 'application/pdf' });
  const finalPdfUrl = await uploadFile(pdfBlobToUpload, `dockets/pdfs/${docketNumber}-${timestamp}.pdf`);
  
  // 6. Save docket object with images and PDF URL to Firestore
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

  const { generalImageUrl, dynamicFields, extraImageUrls } = await processDocketImages(
    docketData,
    docketNumber,
    timestamp
  );

  const extraPdfs = [];
  if (docketData.additionalFiles) {
    for (let i = 0; i < docketData.additionalFiles.length; i++) {
      const file = docketData.additionalFiles[i];
      if (file.type?.toLowerCase().includes('pdf') || file.name?.toLowerCase().endsWith('.pdf')) {
        extraPdfs.push(file);
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
    storeAddress: docketData.storeAddress || '',
    generalImageUrl,
    dynamicFields,
    extraImageUrls,
    extraPdfCount: extraPdfs.length,
    docketNumber,
    productionStatus: docketData.productionStatus || 'Pending',
    updatedAt: serverTimestamp(),
  };

  const pdfDocket = await prepareDocketForPdf(finalDocket);
  const basePdfBlob = await pdf(React.createElement(DocketPDF, { docket: pdfDocket })).toBlob();
  const basePdfArrayBuffer = await basePdfBlob.arrayBuffer();

  let finalPdfBytes;
  if (extraPdfs.length > 0) {
    const mergedPdf = await PDFDocument.load(basePdfArrayBuffer);
    for (const extraPdfFile of extraPdfs) {
      try {
        const extraPdfBuffer = await extraPdfFile.arrayBuffer();
        const extraPdf = await PDFDocument.load(extraPdfBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(extraPdf, extraPdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      } catch (err) {
        console.error('Failed to merge extra PDF:', extraPdfFile.name, err);
      }
    }
    finalPdfBytes = await mergedPdf.save();
  } else {
    finalPdfBytes = basePdfArrayBuffer;
  }

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

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

  // 1. Separate Extra PDFs from Docket Data (Images are already passed as object URLs in docketData)
  const extraPdfs = [];
  if (docketData.additionalFiles) {
    for (let i = 0; i < docketData.additionalFiles.length; i++) {
      const file = docketData.additionalFiles[i];
      if (file.type.toLowerCase().includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
        extraPdfs.push(file);
      }
    }
  }

  // Construct final docket payload (excluding File objects)
  const finalDocket = {
    salesOrderId: docketData.salesOrderId,
    salesOrderNumber: docketData.salesOrderNumber,
    customerDetails: docketData.customerDetails,
    productDetails: docketData.productDetails,
    templateId: docketData.templateId,
    templateName: docketData.templateName,
    generalDescription: docketData.generalDescription,
    // Note: These URLs are LOCAL Object URLs. We don't save them to Firestore, 
    // but we use them to generate the PDF below.
    generalImageUrl: docketData.generalImageUrl,
    dynamicFields: docketData.dynamicFields,
    extraImageUrls: docketData.extraImageUrls || [],
    docketNumber,
    productionStatus: 'Pending',
    createdAt: serverTimestamp(),
  };

  // 2. Generate the base PDF using @react-pdf/renderer
  const basePdfBlob = await pdf(React.createElement(DocketPDF, { docket: finalDocket })).toBlob();
  const basePdfArrayBuffer = await basePdfBlob.arrayBuffer();

  // 3. Merge with extra PDFs using pdf-lib
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

  // 4. Upload ONLY the final PDF to Firebase Storage
  const pdfBlobToUpload = new Blob([finalPdfBytes], { type: 'application/pdf' });
  const finalPdfUrl = await uploadFile(pdfBlobToUpload, `dockets/pdfs/${docketNumber}-${timestamp}.pdf`);
  
  // 5. Clean up local Object URLs before saving to Firestore
  const firestoreDocket = { ...finalDocket, pdfUrl: finalPdfUrl };
  delete firestoreDocket.generalImageUrl; // Don't save local blob URLs to Firestore
  firestoreDocket.dynamicFields = firestoreDocket.dynamicFields.map(f => {
    const { imageUrl, ...rest } = f;
    return rest;
  });

  // 6. Save to Firestore
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

  const extraPdfs = [];
  if (docketData.additionalFiles) {
    for (let i = 0; i < docketData.additionalFiles.length; i++) {
      const file = docketData.additionalFiles[i];
      if (file.type.toLowerCase().includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
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
    generalImageUrl: docketData.generalImageUrl,
    dynamicFields: docketData.dynamicFields,
    extraImageUrls: docketData.extraImageUrls || [],
    docketNumber,
    productionStatus: docketData.productionStatus || 'Pending',
    updatedAt: serverTimestamp(),
  };

  const basePdfBlob = await pdf(React.createElement(DocketPDF, { docket: finalDocket })).toBlob();
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
  delete firestoreDocket.generalImageUrl; 
  firestoreDocket.dynamicFields = firestoreDocket.dynamicFields.map(f => {
    const { imageUrl, ...rest } = f;
    return rest;
  });

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

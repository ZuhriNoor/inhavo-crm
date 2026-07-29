import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  runTransaction,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { compressImage } from '../utils/imageCompression';
import { getStoreCodeAndNextSeq } from '../utils/sequenceUtils';

const SALES_ORDERS_COL = 'salesOrders';

/** Fetch sales orders with pagination */
export const getSalesOrders = async (storeId = null, lastVisibleDoc = null, pageSize = 30) => {
  const constraints = [];
  if (storeId) constraints.push(where('storeId', '==', storeId));
  
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize));

  if (lastVisibleDoc) {
    constraints.push(startAfter(lastVisibleDoc));
  }
  
  const q = query(collection(db, SALES_ORDERS_COL), ...constraints);
  
  const snap = await getDocs(q);
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    data: orders,
    lastDoc: snap.docs[snap.docs.length - 1],
    hasMore: snap.docs.length === pageSize
  };
};

/** Fetch a single sales order */
export const getSaleOrder = async (id) => {
  const snap = await getDoc(doc(db, SALES_ORDERS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Update sales order status */
export const updateSaleOrderStatus = async (id, status) => {
  await updateDoc(doc(db, SALES_ORDERS_COL, id), {
    status,
    updatedAt: serverTimestamp(),
  });
};

/** Update full sales order details */
export const updateSaleOrder = async (id, orderData) => {
  const docRef = doc(db, SALES_ORDERS_COL, id);
  const productsTotal = (orderData.items || []).reduce(
    (acc, curr) => acc + (Number(curr.qty) || 0) * (Number(curr.unitPrice) || 0),
    0
  );
  const extraCostsTotal = (orderData.extraCosts || []).reduce(
    (acc, curr) => acc + (Number(curr.amount) || 0),
    0
  );
  const grandTotal = productsTotal + extraCostsTotal;

  const updatedPayload = {
    ...orderData,
    productsTotal,
    extraCostsTotal,
    grandTotal,
    totalAmount: grandTotal,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updatedPayload);
  return { id, ...updatedPayload };
};

/** Upload Attachment (Proof, Screenshot, Document) to Sales Order */
export const uploadSalesOrderAttachment = async (orderId, file, name = '') => {
  if (!orderId || !file) throw new Error('Order ID and file are required');

  let fileToUpload = file;
  const isImage = file.type.startsWith('image/');
  if (isImage) {
    try {
      fileToUpload = await compressImage(file);
    } catch (err) {
      console.warn('Image compression failed, using original file', err);
    }
  }

  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `salesOrders/${orderId}/${timestamp}_${safeFileName}`;
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, fileToUpload);
  const downloadUrl = await getDownloadURL(fileRef);

  const attachmentData = {
    id: `att_${timestamp}`,
    name: name.trim() || file.name,
    fileName: file.name,
    storagePath,
    url: downloadUrl,
    fileType: isImage ? 'image' : file.type.includes('pdf') ? 'pdf' : 'document',
    uploadedAt: new Date().toISOString(),
  };

  const orderRef = doc(db, SALES_ORDERS_COL, orderId);
  await updateDoc(orderRef, {
    attachments: arrayUnion(attachmentData),
    updatedAt: serverTimestamp(),
  });

  return attachmentData;
};

/** Delete Attachment from Sales Order */
export const deleteSalesOrderAttachment = async (orderId, attachment) => {
  if (!orderId || !attachment) return;

  const orderRef = doc(db, SALES_ORDERS_COL, orderId);
  await updateDoc(orderRef, {
    attachments: arrayRemove(attachment),
    updatedAt: serverTimestamp(),
  });

  if (attachment.storagePath) {
    try {
      const fileRef = ref(storage, attachment.storagePath);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Failed to delete attachment from Firebase Storage:', err);
    }
  }
};

/** Convert Quotation to Sale Order (Atomic Transaction) */
export const createSaleOrderFromQuotation = async (quotation) => {
  return await runTransaction(db, async (transaction) => {
    // 1. Check if it's already converted to prevent duplicates
    const quotationRef = doc(db, 'quotations', quotation.id);
    const quotationDoc = await transaction.get(quotationRef);
    if (!quotationDoc.exists()) throw new Error("Quotation not found");
    if (quotationDoc.data().status === 'Converted') {
        throw new Error("Quotation is already converted to a Sales Order.");
    }

    // 2. Generate Sequential Sales Order Number
    const counterRef = doc(db, 'counters', 'salesOrderCounters');
    const { refNumber: salesOrderNumber } = await getStoreCodeAndNextSeq(
      transaction,
      counterRef,
      quotation.storeId,
      'SO'
    );

    // 3. Create Sale Order Document
    const salesOrderRef = doc(collection(db, SALES_ORDERS_COL));
    const salesOrderData = {
      salesOrderNumber,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      leadId: quotation.leadId,
      storeId: quotation.storeId,
      customerDetails: quotation.customerDetails,
      items: quotation.items,
      extraCosts: quotation.extraCosts || [],
      productsTotal: quotation.productsTotal || quotation.totalAmount || 0,
      extraCostsTotal: quotation.extraCostsTotal || 0,
      grandTotal: quotation.grandTotal || quotation.totalAmount || 0,
      totalAmount: quotation.grandTotal || quotation.totalAmount || 0,
      status: 'Confirmed',
      createdAt: serverTimestamp(),
    };
    transaction.set(salesOrderRef, salesOrderData);

    // 4. Update Quotation Status to 'Converted'
    transaction.update(quotationRef, { 
        status: 'Converted', 
        salesOrderId: salesOrderRef.id,
        salesOrderNumber: salesOrderNumber 
    });

    return { salesOrderId: salesOrderRef.id, salesOrderNumber };
  });
};

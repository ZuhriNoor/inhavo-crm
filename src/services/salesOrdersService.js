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
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

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
    const counterDoc = await transaction.get(counterRef);
    
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const monthKey = `${yy}${mm}`;

    let nextCount = 1;
    if (counterDoc.exists() && counterDoc.data()[monthKey]) {
      nextCount = counterDoc.data()[monthKey] + 1;
    }
    const salesOrderNumber = `SO${monthKey}${String(nextCount).padStart(3, '0')}`;

    // Update counter
    transaction.set(counterRef, { [monthKey]: nextCount }, { merge: true });

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
      totalAmount: quotation.totalAmount,
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

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

const PO_COL = 'purchaseOrders';

export const getPurchaseOrdersBySalesOrder = async (salesOrderId) => {
  try {
    const q = query(
      collection(db, PO_COL),
      where('salesOrderId', '==', salesOrderId)
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching purchase orders for sales order:', error);
    return [];
  }
};

export const getAllPurchaseOrders = async (storeId = null) => {
  try {
    let q;
    if (storeId) {
      q = query(
        collection(db, PO_COL),
        where('storeId', '==', storeId)
      );
    } else {
      q = query(
        collection(db, PO_COL)
      );
    }
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return [];
  }
};

export const createPurchaseOrder = async (poData) => {
  return await runTransaction(db, async (transaction) => {
    // Generate sequential PO number (PO-YY-0001)
    const counterRef = doc(db, 'counters', 'poCounters');
    const counterDoc = await transaction.get(counterRef);
    
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);

    let nextCount = 1;
    if (counterDoc.exists() && counterDoc.data()[yy]) {
      nextCount = counterDoc.data()[yy] + 1;
    }
    const poNumber = `PO-${yy}-${String(nextCount).padStart(4, '0')}`;

    transaction.set(counterRef, { [yy]: nextCount }, { merge: true });

    const newPoRef = doc(collection(db, PO_COL));
    const dataToSave = {
      ...poData,
      poNumber,
      status: poData.status || 'Issued',
      createdAt: serverTimestamp()
    };

    transaction.set(newPoRef, dataToSave);
    return { id: newPoRef.id, poNumber };
  });
};

export const updatePurchaseOrderStatus = async (id, status) => {
  const docRef = doc(db, PO_COL, id);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp()
  });
};

export const updatePurchaseOrder = async (id, poData) => {
  const docRef = doc(db, PO_COL, id);
  const updatedData = {
    ...poData,
    updatedAt: serverTimestamp()
  };
  await updateDoc(docRef, updatedData);
  return { id, ...updatedData };
};

export const deletePurchaseOrder = async (id) => {
  const docRef = doc(db, PO_COL, id);
  await deleteDoc(docRef);
};

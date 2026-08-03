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

import { getStoreCodeAndNextSeq } from '../utils/sequenceUtils';

const PO_COL = 'purchaseOrders';

export const getPurchaseOrdersBySalesOrder = async (salesOrderId, storeId = null, profile = null) => {
  try {
    const constraints = [where('salesOrderId', '==', salesOrderId)];
    if (storeId) constraints.push(where('storeId', '==', storeId));
    if (profile?.role !== 'admin' && profile?.dataAccessLevel === 'own' && profile?.uid) {
      constraints.push(where('visibleTo', 'array-contains', profile.uid));
    }
    const q = query(collection(db, PO_COL), ...constraints);
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

export const getAllPurchaseOrders = async (storeId = null, profile = null) => {
  try {
    const constraints = [];
    if (storeId) constraints.push(where('storeId', '==', storeId));
    
    if (profile?.role !== 'admin' && profile?.dataAccessLevel === 'own' && profile?.uid) {
      constraints.push(where('visibleTo', 'array-contains', profile.uid));
    }
    
    const q = query(collection(db, PO_COL), ...constraints);
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
    let soVisibleTo = [];
    if (poData.salesOrderId) {
      const soSnap = await transaction.get(doc(db, 'salesOrders', poData.salesOrderId));
      if (soSnap.exists()) {
        soVisibleTo = soSnap.data().visibleTo || [];
      }
    }

    const counterRef = doc(db, 'counters', 'poCounters');
    const { refNumber: poNumber } = await getStoreCodeAndNextSeq(
      transaction,
      counterRef,
      poData.storeId,
      'PO'
    );

    const auth = (await import('firebase/auth')).getAuth();
    const uid = auth.currentUser?.uid;
    const creator = poData.createdBy || uid || null;

    const visibleTo = [...new Set([...soVisibleTo, creator].filter(Boolean))];

    const newPoRef = doc(collection(db, PO_COL));
    const dataToSave = {
      ...poData,
      poNumber,
      status: poData.status || 'Issued',
      createdBy: creator,
      visibleTo,
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

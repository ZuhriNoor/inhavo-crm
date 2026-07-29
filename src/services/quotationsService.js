import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { getStoreCodeAndNextSeq } from '../utils/sequenceUtils';

const QUOTATIONS_COL = 'quotations';

/** Fetch all quotations for a store */
export const getQuotations = async (storeId, lastVisibleDoc = null, pageSize = 30) => {
  const constraints = [where('storeId', '==', storeId), orderBy('createdAt', 'desc'), limit(pageSize)];
  if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));
  
  const q = query(collection(db, QUOTATIONS_COL), ...constraints);
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  return { data, lastDoc: snap.docs[snap.docs.length - 1], hasMore: snap.docs.length === pageSize };
};

/** Fetch all quotations for a lead */
export const getQuotationsByLead = async (leadId, storeId = null) => {
  const constraints = [where('leadId', '==', leadId)];
  if (storeId) constraints.push(where('storeId', '==', storeId));
  constraints.push(orderBy('createdAt', 'desc'));
  
  const q = query(collection(db, QUOTATIONS_COL), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Fetch a single quotation */
export const getQuotation = async (id) => {
  const snap = await getDoc(doc(db, QUOTATIONS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Create a quotation record with sequential ID */
export const createQuotation = async (data) => {
  return await runTransaction(db, async (transaction) => {
    const counterRef = doc(db, 'counters', 'quotationCounters');
    const { refNumber: quotationNumber } = await getStoreCodeAndNextSeq(
      transaction,
      counterRef,
      data.storeId,
      'QN'
    );

    // Create quotation
    const newQuotationRef = doc(collection(db, QUOTATIONS_COL));
    transaction.set(newQuotationRef, {
      ...data,
      quotationNumber,
      createdAt: serverTimestamp(),
    });

    return { id: newQuotationRef.id, quotationNumber };
  });
};

/** Update a quotation (e.g., attach PDF URL) */
export const updateQuotation = async (id, data) => {
  await updateDoc(doc(db, QUOTATIONS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

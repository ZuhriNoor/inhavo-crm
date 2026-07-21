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
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';

const QUOTATIONS_COL = 'quotations';

/** Fetch all quotations for a lead */
export const getQuotationsByLead = async (leadId, storeId) => {
  const constraints = [where('leadId', '==', leadId)];
  if (storeId) constraints.push(where('storeId', '==', storeId));
  const q = query(
    collection(db, QUOTATIONS_COL),
    ...constraints,
    orderBy('createdAt', 'desc'),
  );
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
    const counterDoc = await transaction.get(counterRef);

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const monthKey = `${yy}${mm}`;

    let nextCount = 1;
    if (counterDoc.exists()) {
      const counters = counterDoc.data();
      if (counters[monthKey]) {
        nextCount = counters[monthKey] + 1;
      }
    }

    const quotationNumber = `INH${monthKey}${String(nextCount).padStart(3, '0')}`;

    // Update counter
    transaction.set(counterRef, { [monthKey]: nextCount }, { merge: true });

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

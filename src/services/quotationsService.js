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
} from 'firebase/firestore';
import { db } from './firebase';

const QUOTATIONS_COL = 'quotations';

/** Fetch all quotations for a lead */
export const getQuotationsByLead = async (leadId) => {
  const q = query(
    collection(db, QUOTATIONS_COL),
    where('leadId', '==', leadId),
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

/** Create a quotation record */
export const createQuotation = async (data) => {
  const ref_ = await addDoc(collection(db, QUOTATIONS_COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref_.id;
};

/** Update a quotation (e.g., attach PDF URL) */
export const updateQuotation = async (id, data) => {
  await updateDoc(doc(db, QUOTATIONS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

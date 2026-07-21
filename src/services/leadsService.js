// Leads CRUD service
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';

const LEADS_COL = 'leads';

/** Fetch all leads for given store IDs */
export const getLeads = async (storeIds) => {
  if (!storeIds || storeIds.length === 0) return [];
  const q = query(
    collection(db, LEADS_COL),
    where('storeId', 'in', storeIds),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Fetch a single lead by ID */
export const getLead = async (id) => {
  const snap = await getDoc(doc(db, LEADS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Create a new lead */
export const createLead = async (data) => {
  return await runTransaction(db, async (transaction) => {
    const counterRef = doc(db, 'counters', 'leadCounter');
    const counterDoc = await transaction.get(counterRef);

    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentCount || 0) + 1;
    }

    const leadNumber = `ENQ${String(nextCount).padStart(5, '0')}`;

    transaction.set(counterRef, { currentCount: nextCount }, { merge: true });

    const newLeadRef = doc(collection(db, LEADS_COL));
    transaction.set(newLeadRef, {
      ...data,
      leadNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newLeadRef.id;
  });
};

/** Update a lead */
export const updateLead = async (id, data) => {
  await updateDoc(doc(db, LEADS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/** Move lead to a different stage */
export const moveLeadToStage = async (leadId, stageId) => {
  await updateDoc(doc(db, LEADS_COL, leadId), {
    stageId,
    updatedAt: serverTimestamp(),
  });
};

/** Delete a lead */
export const deleteLead = async (id) => {
  await deleteDoc(doc(db, LEADS_COL, id));
};

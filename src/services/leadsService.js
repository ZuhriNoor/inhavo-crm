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
  limit,
  startAfter,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { getStoreCodeAndNextSeq } from '../utils/sequenceUtils';

const LEADS_COL = 'leads';

/** Fetch leads for given store IDs with pagination */
export const getLeads = async (storeIds, includeDeleted = false, lastVisibleDoc = null, pageSize = 30) => {
  if (!storeIds || storeIds.length === 0) return { data: [], lastDoc: null, hasMore: false };
  
  const constraints = [
    where('storeId', 'in', storeIds),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  ];

  if (lastVisibleDoc) {
    constraints.push(startAfter(lastVisibleDoc));
  }

  const q = query(collection(db, LEADS_COL), ...constraints);
  
  const snap = await getDocs(q);
  const leads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  return { 
    data: includeDeleted ? leads : leads.filter((l) => !l.deleted), 
    lastDoc: snap.docs[snap.docs.length - 1], 
    hasMore: snap.docs.length === pageSize 
  };
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
    const { refNumber: leadNumber } = await getStoreCodeAndNextSeq(
      transaction,
      counterRef,
      data.storeId,
      'ENQ'
    );

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

/** Soft delete a lead */
export const deleteLead = async (id) => {
  await updateDoc(doc(db, LEADS_COL, id), {
    deleted: true,
    deletedAt: serverTimestamp(),
  });
};

/** Restore a soft-deleted lead */
export const restoreLead = async (id) => {
  await updateDoc(doc(db, LEADS_COL, id), {
    deleted: false,
    updatedAt: serverTimestamp(),
  });
};

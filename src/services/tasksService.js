// Tasks CRUD service
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  or,
  and,
} from 'firebase/firestore';
import { db } from './firebase';

const TASKS_COL = 'tasks';

/** Fetch tasks for given store IDs with pagination */
export const getTasks = async (storeIds, lastVisibleDoc = null, pageSize = 30, profile = null) => {
  if (!storeIds || storeIds.length === 0) return { data: [], lastDoc: null, hasMore: false };
  
  const constraints = [
    where('storeId', 'in', storeIds)
  ];

  if (profile?.role !== 'admin' && profile?.dataAccessLevel === 'own' && profile?.uid) {
    constraints.push(where('visibleTo', 'array-contains', profile.uid));
  }

  constraints.push(orderBy('deadline', 'asc'));
  constraints.push(limit(pageSize));

  if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

  const q = query(collection(db, TASKS_COL), ...constraints);
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    data,
    lastDoc: snap.docs[snap.docs.length - 1],
    hasMore: snap.docs.length === pageSize
  };
};

/** Fetch tasks for a specific lead */
export const getTasksByLead = async (leadId, storeId, profile = null) => {
  const constraints = [where('leadId', '==', leadId)];
  if (storeId) constraints.push(where('storeId', '==', storeId));

  if (profile?.role !== 'admin' && profile?.dataAccessLevel === 'own' && profile?.uid) {
    constraints.push(where('visibleTo', 'array-contains', profile.uid));
  }

  const q = query(
    collection(db, TASKS_COL),
    ...constraints,
    orderBy('deadline', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Fetch tasks assigned to a specific user */
export const getTasksByUser = async (userId) => {
  const q = query(
    collection(db, TASKS_COL),
    where('assignedUserId', '==', userId),
    orderBy('deadline', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Create a task */
export const createTask = async (data) => {
  const auth = (await import('firebase/auth')).getAuth();
  const uid = auth.currentUser?.uid;
  const creator = data.createdBy || uid;

  let leadVisibleTo = [];
  let leadDataToSave = {};
  if (data.leadId) {
    const { getDoc, doc } = await import('firebase/firestore');
    const leadSnap = await getDoc(doc(db, 'leads', data.leadId));
    if (leadSnap.exists()) {
      const lData = leadSnap.data();
      leadVisibleTo = lData.visibleTo || [];
      leadDataToSave = {
        leadNumber: lData.leadNumber || null,
        leadTitle: lData.opportunityTitle || lData.customerName || 'Lead',
        customerName: lData.customerName || null,
      };
    }
  }

  const visibleTo = [...new Set([...leadVisibleTo, creator, data.assignedUserId].filter(Boolean))];

  const ref = await addDoc(collection(db, TASKS_COL), {
    ...data,
    ...leadDataToSave,
    createdBy: creator,
    visibleTo,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/** Update a task */
export const updateTask = async (id, data) => {
  let updateData = { ...data, updatedAt: serverTimestamp() };
  const { getDoc, doc } = await import('firebase/firestore');

  // If leadId changed or assignedUserId changed, recompute visibleTo and lead details
  if (data.leadId !== undefined || data.assignedUserId !== undefined) {
    const snap = await getDoc(doc(db, TASKS_COL, id));
    if (snap.exists()) {
      const existing = snap.data();
      const currentLeadId = data.leadId !== undefined ? data.leadId : existing.leadId;
      const assignedUserId = data.assignedUserId !== undefined ? data.assignedUserId : existing.assignedUserId;

      let leadVisibleTo = [];
      if (currentLeadId) {
        const leadSnap = await getDoc(doc(db, 'leads', currentLeadId));
        if (leadSnap.exists()) {
          const lData = leadSnap.data();
          leadVisibleTo = lData.visibleTo || [];
          updateData.leadNumber = lData.leadNumber || null;
          updateData.leadTitle = lData.opportunityTitle || lData.customerName || 'Lead';
          updateData.customerName = lData.customerName || null;
        }
      } else if (data.leadId === null) {
        updateData.leadNumber = null;
        updateData.leadTitle = null;
        updateData.customerName = null;
      }

      updateData.visibleTo = [...new Set([...leadVisibleTo, existing.createdBy, assignedUserId].filter(Boolean))];
    }
  }

  await updateDoc(doc(db, TASKS_COL, id), updateData);
};

/** Mark task as completed */
export const completeTask = async (id) => {
  await updateDoc(doc(db, TASKS_COL, id), {
    status: 'completed',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/** Delete a task */
export const deleteTask = async (id) => {
  await deleteDoc(doc(db, TASKS_COL, id));
};

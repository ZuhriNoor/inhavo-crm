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
  if (data.leadId) {
    const { getDoc, doc } = await import('firebase/firestore');
    const leadSnap = await getDoc(doc(db, 'leads', data.leadId));
    if (leadSnap.exists()) {
      leadVisibleTo = leadSnap.data().visibleTo || [];
    }
  }

  const visibleTo = [...new Set([...leadVisibleTo, creator, data.assignedUserId].filter(Boolean))];

  const ref = await addDoc(collection(db, TASKS_COL), {
    ...data,
    createdBy: creator,
    visibleTo,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/** Update a task */
export const updateTask = async (id, data) => {
  let updateData = { ...data, updatedAt: serverTimestamp() };
  
  if (data.assignedUserId !== undefined) {
    const { getDoc, doc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, TASKS_COL, id));
    if (snap.exists()) {
      const existing = snap.data();
      let leadVisibleTo = [];
      if (existing.leadId) {
        const leadSnap = await getDoc(doc(db, 'leads', existing.leadId));
        if (leadSnap.exists()) {
          leadVisibleTo = leadSnap.data().visibleTo || [];
        }
      }
      updateData.visibleTo = [...new Set([...leadVisibleTo, existing.createdBy, data.assignedUserId].filter(Boolean))];
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

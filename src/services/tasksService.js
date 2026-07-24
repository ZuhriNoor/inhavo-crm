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
} from 'firebase/firestore';
import { db } from './firebase';

const TASKS_COL = 'tasks';

/** Fetch tasks for given store IDs with pagination */
export const getTasks = async (storeIds, lastVisibleDoc = null, pageSize = 30) => {
  if (!storeIds || storeIds.length === 0) return { data: [], lastDoc: null, hasMore: false };
  const constraints = [
    where('storeId', 'in', storeIds),
    orderBy('deadline', 'asc'),
    limit(pageSize)
  ];
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
export const getTasksByLead = async (leadId, storeId) => {
  const constraints = [where('leadId', '==', leadId)];
  if (storeId) constraints.push(where('storeId', '==', storeId));
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
  const ref = await addDoc(collection(db, TASKS_COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/** Update a task */
export const updateTask = async (id, data) => {
  await updateDoc(doc(db, TASKS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
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

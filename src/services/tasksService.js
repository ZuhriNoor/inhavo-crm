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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const TASKS_COL = 'tasks';

/** Fetch all tasks for given store IDs */
export const getTasks = async (storeIds) => {
  if (!storeIds || storeIds.length === 0) return [];
  const q = query(
    collection(db, TASKS_COL),
    where('storeId', 'in', storeIds),
    orderBy('deadline', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Fetch tasks for a specific lead */
export const getTasksByLead = async (leadId) => {
  const q = query(
    collection(db, TASKS_COL),
    where('leadId', '==', leadId),
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

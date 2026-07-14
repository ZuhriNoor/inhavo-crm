// Stores CRUD service
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const STORES_COL = 'stores';

export const getStores = async () => {
  const q = query(collection(db, STORES_COL), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createStore = async (data) => {
  const ref = await addDoc(collection(db, STORES_COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateStore = async (id, data) => {
  await updateDoc(doc(db, STORES_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteStore = async (id) => {
  await deleteDoc(doc(db, STORES_COL, id));
};

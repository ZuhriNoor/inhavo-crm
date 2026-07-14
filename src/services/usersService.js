// Users CRUD service — Firestore docs use UID as the document ID
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const USERS_COL = 'users';

/** Fetch all user profiles from Firestore */
export const getUsers = async () => {
  // Simple collection fetch — no orderBy to avoid needing an index
  const snap = await getDocs(collection(db, USERS_COL));
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Sort client-side by displayName
  return users.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
};

/** Fetch a single user profile by UID */
export const getUser = async (uid) => {
  const snap = await getDoc(doc(db, USERS_COL, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Update a user profile by UID */
export const updateUser = async (uid, data) => {
  await updateDoc(doc(db, USERS_COL, uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/** Delete a user profile by UID */
export const deleteUserProfile = async (uid) => {
  await deleteDoc(doc(db, USERS_COL, uid));
};

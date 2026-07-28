import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const VENDORS_COL = 'vendors';

export const getVendors = async () => {
  try {
    const q = query(collection(db, VENDORS_COL), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
};

export const createVendor = async (vendorData) => {
  const docRef = await addDoc(collection(db, VENDORS_COL), {
    ...vendorData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateVendor = async (id, vendorData) => {
  const docRef = doc(db, VENDORS_COL, id);
  await updateDoc(docRef, {
    ...vendorData,
    updatedAt: serverTimestamp()
  });
};

export const deleteVendor = async (id) => {
  const docRef = doc(db, VENDORS_COL, id);
  await deleteDoc(docRef);
};

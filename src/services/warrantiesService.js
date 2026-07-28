import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';

const WARRANTIES_COL = 'warranties';

export const getWarrantiesBySaleOrder = async (salesOrderId) => {
  const q = query(
    collection(db, WARRANTIES_COL),
    where('salesOrderId', '==', salesOrderId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createWarranty = async (warrantyData) => {
  return await runTransaction(db, async (transaction) => {
    // Generate sequential warranty number
    const counterRef = doc(db, 'counters', 'warrantyCounters');
    const counterDoc = await transaction.get(counterRef);
    
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mmKey = `${yy}`;

    let nextCount = 1;
    if (counterDoc.exists() && counterDoc.data()[mmKey]) {
      nextCount = counterDoc.data()[mmKey] + 1;
    }
    const warrantyNumber = `WAR-${mmKey}-${String(nextCount).padStart(4, '0')}`;

    // Update counter
    transaction.set(counterRef, { [mmKey]: nextCount }, { merge: true });

    const newWarrantyRef = doc(collection(db, WARRANTIES_COL));
    const dataToSave = {
      ...warrantyData,
      warrantyNumber,
      createdAt: serverTimestamp(),
    };
    
    transaction.set(newWarrantyRef, dataToSave);
    return { id: newWarrantyRef.id, warrantyNumber };
  });
};

export const updateWarranty = async (id, warrantyData) => {
  const docRef = doc(db, WARRANTIES_COL, id);
  await setDoc(docRef, {
    ...warrantyData,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { id, ...warrantyData };
};

export const getWarrantySettings = async () => {
  try {
    const docRef = doc(db, 'settings', 'warrantySettings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    // Return default settings if not exists
    return {
      termsText: '5 Years on Structural Wood Frame against manufacturing defects.\n2 Years on Foam Density and resilience.\n1 Year on Stitching and Fabric/Leatherette peeling.\n\nNormal wear and tear is not covered under this warranty. Any physical damage caused by the customer will void the warranty.'
    };
  } catch (error) {
    console.error('Error fetching warranty settings:', error);
    return { termsText: '' };
  }
};

export const updateWarrantySettings = async (settingsData) => {
  try {
    const docRef = doc(db, 'settings', 'warrantySettings');
    await setDoc(docRef, settingsData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating warranty settings:', error);
    throw error;
  }
};

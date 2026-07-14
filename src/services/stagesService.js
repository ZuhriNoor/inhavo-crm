// Pipeline Stages CRUD service
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
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const STAGES_COL = 'stages';

export const getStages = async () => {
  const q = query(collection(db, STAGES_COL), orderBy('order'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createStage = async (data) => {
  const ref = await addDoc(collection(db, STAGES_COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateStage = async (id, data) => {
  await updateDoc(doc(db, STAGES_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteStage = async (id) => {
  await deleteDoc(doc(db, STAGES_COL, id));
};

/** Batch-update order for drag-and-drop reordering */
export const reorderStages = async (stages) => {
  const batch = writeBatch(db);
  stages.forEach((stage, idx) => {
    batch.update(doc(db, STAGES_COL, stage.id), { order: idx });
  });
  await batch.commit();
};

/** Default stages to seed on first run */
export const DEFAULT_STAGES = [
  { name: 'Lead', order: 0, color: '#3b82f6' },
  { name: 'Opportunity', order: 1, color: '#f59e0b' },
  { name: 'Quotation', order: 2, color: '#8b5cf6' },
  { name: 'Won', order: 3, color: '#10b981' },
  { name: 'Lost', order: 4, color: '#ef4444' },
];

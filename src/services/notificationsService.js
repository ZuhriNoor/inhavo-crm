// Notifications service
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
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const NOTIFS_COL = 'notifications';

/** Fetch all notifications for a user */
export const getNotifications = async (userId) => {
  const q = query(
    collection(db, NOTIFS_COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Create a notification */
export const createNotification = async ({ userId, type, message, relatedId }) => {
  await addDoc(collection(db, NOTIFS_COL), {
    userId,
    type,
    message,
    relatedId: relatedId || null,
    read: false,
    createdAt: serverTimestamp(),
  });
};

/** Mark a notification as read */
export const markNotificationRead = async (id) => {
  await updateDoc(doc(db, NOTIFS_COL, id), { read: true });
};

/** Mark all unread notifications as read */
export const markAllRead = async (userId) => {
  const q = query(
    collection(db, NOTIFS_COL),
    where('userId', '==', userId),
    where('read', '==', false),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
};

/** Delete a notification */
export const deleteNotification = async (id) => {
  await deleteDoc(doc(db, NOTIFS_COL, id));
};

/** Trigger: new lead assigned to a user */
export const notifyLeadAssigned = async (userId, leadName, leadId) => {
  await createNotification({
    userId,
    type: 'lead_assigned',
    message: `You have been assigned a new lead: ${leadName}`,
    relatedId: leadId,
  });
};

/** Trigger: task deadline approaching (within 24h) */
export const notifyTaskDueSoon = async (userId, taskTitle, taskId) => {
  await createNotification({
    userId,
    type: 'task_due',
    message: `Task "${taskTitle}" is due soon`,
    relatedId: taskId,
  });
};

/** Trigger: task overdue */
export const notifyTaskOverdue = async (userId, taskTitle, taskId) => {
  await createNotification({
    userId,
    type: 'task_overdue',
    message: `Task "${taskTitle}" is overdue`,
    relatedId: taskId,
  });
};

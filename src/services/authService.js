// Auth service — wraps Firebase Auth operations
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Sign in with email and password.
 */
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

/**
 * Sign out current user.
 */
export const logout = () => signOut(auth);

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export const subscribeToAuth = (callback) => onAuthStateChanged(auth, callback);

/**
 * Fetch user profile from Firestore.
 */
export const getUserProfile = async (uid) => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { uid, ...snap.data() };
  }
  return null;
};

/**
 * Create or update a user profile in Firestore.
 */
export const upsertUserProfile = async (uid, data) => {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, data, { merge: true });
};

// fix-admin-profile.mjs
// Writes the Firestore profile for an existing admin Auth user
// Run: node fix-admin-profile.mjs

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAOEQi2pXiXllaFwIkTwAcnaxyy1byNkfs',
  authDomain: 'inhavo-crm.firebaseapp.com',
  projectId: 'inhavo-crm',
  storageBucket: 'inhavo-crm.firebasestorage.app',
  messagingSenderId: '1045691048510',
  appId: '1:1045691048510:web:a58f101aa9e8f8a76e676f',
};

const ADMIN_EMAIL = 'admin@inhavo.com';
const ADMIN_PASSWORD = 'Admin@123456';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function fixAdminProfile() {
  console.log('🔑 Signing in as admin...');
  try {
    const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const uid = cred.user.uid;
    console.log(`✅ Signed in: ${uid}`);

    // Check if profile already exists
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      console.log('✅ Firestore profile already exists!');
      console.log('   Role:', snap.data().role);
    } else {
      // Write the profile — allowed because request.auth.uid == userId
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: ADMIN_EMAIL,
        displayName: 'Administrator',
        role: 'admin',
        assignedStores: [],
        createdAt: serverTimestamp(),
      });
      console.log('✅ Firestore admin profile created!');
    }

    await signOut(auth);
    console.log('');
    console.log('──────────────────────────────────────────');
    console.log('  Admin is ready to use!');
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log('  ⚠️  Change the password after first login.');
    console.log('──────────────────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixAdminProfile();

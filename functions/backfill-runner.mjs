// backfill-runner.mjs
// Runs the deployed backfillClaims Cloud Function using admin credentials
// Run: node backfill-runner.mjs

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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

const BACKFILL_URL = 'https://us-central1-inhavo-crm.cloudfunctions.net/backfillClaims';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
  console.log('🔑 Signing in as admin...');
  const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  const token = await cred.user.getIdToken();

  console.log('📡 Calling backfillClaims endpoint...');
  const res = await fetch(BACKFILL_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  if (res.ok) {
    console.log('✅', text);
  } else {
    console.error('❌ Failed:', res.status, text);
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

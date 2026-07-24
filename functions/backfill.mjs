// backfill.mjs
// Run this script from the functions directory: node backfill.mjs
// Note: This requires GOOGLE_APPLICATION_CREDENTIALS or it can use default application credentials if running via firebase CLI.
// Wait, we need a service account key to use firebase-admin locally, OR we can just use the config we used in fix-admin-profile.mjs.
// Wait, `fix-admin-profile.mjs` used the client SDK! The client SDK CANNOT set custom claims. We MUST use `firebase-admin`.
// To use `firebase-admin` locally, we need to initialize it. If the user is logged into the Firebase CLI (`firebase login`), we can often just do `admin.initializeApp()` and it will pick up the local credentials, but sometimes it doesn't.
// Let's use `firebase-admin` and instruct the user how to run it if it fails.

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize the app. If running locally with Firebase CLI logged in, this often works.
// If it fails with "Could not load the default credentials", we need a service account key.
admin.initializeApp({
  projectId: 'inhavo-crm'
});

const db = getFirestore();
const auth = getAuth();

async function backfill() {
  console.log('Fetching all users from Firestore...');
  const usersSnap = await db.collection('users').get();
  
  if (usersSnap.empty) {
    console.log('No users found in Firestore.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const userId = doc.id;
    const role = data.role || 'user';
    const assignedStores = data.assignedStores || [];

    console.log(`Setting claims for user ${userId} (${data.email || 'No email'}) - Role: ${role}, Stores: ${assignedStores.length}`);
    try {
      await auth.setCustomUserClaims(userId, {
        role: role,
        stores: assignedStores
      });
      successCount++;
    } catch (error) {
      console.error(`Failed to set claims for user ${userId}:`, error.message);
      failCount++;
    }
  }

  console.log('-----------------------------------');
  console.log(`Backfill complete. Success: ${successCount}, Failed: ${failCount}`);
  console.log('-----------------------------------');
  process.exit(0);
}

backfill().catch(err => {
  console.error("Backfill script failed:", err);
  process.exit(1);
});

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

exports.onUserWrite = onDocumentWritten('users/{userId}', async (event) => {
  const userId = event.params.userId;
  const auth = getAuth();

  const newValue = event.data.after.data();

  // If the document is deleted, revoke custom claims
  if (!newValue) {
    console.log(`User ${userId} deleted. Revoking custom claims.`);
    try {
      await auth.setCustomUserClaims(userId, null);
    } catch (error) {
      console.error(`Error revoking custom claims for user ${userId}:`, error);
    }
    return null;
  }

  const role = newValue.role || 'user';
  const assignedStores = newValue.assignedStores || [];

  // Get current claims to see if an update is necessary
  let currentClaims = {};
  try {
    const userRecord = await auth.getUser(userId);
    currentClaims = userRecord.customClaims || {};
  } catch (error) {
    console.error(`Error fetching user record for ${userId}:`, error);
    if (error.code === 'auth/user-not-found') return null;
  }

  const claimsChanged =
    currentClaims.role !== role ||
    JSON.stringify(currentClaims.stores || []) !== JSON.stringify(assignedStores);

  if (claimsChanged) {
    console.log(`Setting custom claims for user ${userId}. Role: ${role}, Stores: ${assignedStores.length}`);
    try {
      await auth.setCustomUserClaims(userId, { role, stores: assignedStores });
      console.log(`Successfully updated claims for user ${userId}`);
    } catch (error) {
      console.error(`Error setting custom claims for user ${userId}:`, error);
    }
  } else {
    console.log(`No claim changes needed for user ${userId}`);
  }

  return null;
});

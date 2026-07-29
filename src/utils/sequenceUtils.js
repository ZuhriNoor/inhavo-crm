import { doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Atomically generates a store-dependent reference number and increments the store-specific counter.
 * Format: [PREFIX]/[STORE_CODE]/[MMYY]/[SEQUENCE]
 */
export const getStoreCodeAndNextSeq = async (transaction, counterDocRef, storeId, prefix) => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yearKey = `Y${now.getFullYear()}`;

  let storeCode = 'STR';
  if (storeId) {
    try {
      const storeRef = doc(db, 'stores', storeId);
      const storeDoc = await transaction.get(storeRef);
      if (storeDoc.exists()) {
        const sData = storeDoc.data();
        storeCode = (sData.code || sData.name || 'STR').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'STR';
      }
    } catch (e) {
      console.warn('Could not fetch store for code, defaulting to STR', e);
    }
  }

  // Store-specific counter key
  const counterKey = storeId ? `${storeId}_${yearKey}` : `GLOBAL_${yearKey}`;

  const counterDoc = await transaction.get(counterDocRef);
  let nextCount = 1;
  if (counterDoc.exists() && counterDoc.data()[counterKey]) {
    nextCount = counterDoc.data()[counterKey] + 1;
  }

  transaction.set(counterDocRef, { [counterKey]: nextCount }, { merge: true });

  const seqStr = String(nextCount).padStart(4, '0');
  
  let refNumber = '';
  if (prefix.endsWith('-')) {
    refNumber = `${prefix}${storeCode}/${mm}${yy}/${seqStr}`;
  } else {
    refNumber = `${prefix}/${storeCode}/${mm}${yy}/${seqStr}`;
  }

  return { refNumber, nextCount, storeCode };
};

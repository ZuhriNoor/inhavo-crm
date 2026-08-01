import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const runVisibleToMigration = async (onProgress) => {
  try {
    onProgress('Fetching all leads...');
    const leadsSnap = await getDocs(collection(db, 'leads'));
    const leadsData = {};
    for (const d of leadsSnap.docs) {
      const data = d.data();
      const visibleTo = [...new Set([data.createdBy, data.assignedUserId].filter(Boolean))];
      leadsData[d.id] = { ...data, visibleTo };
      await updateDoc(doc(db, 'leads', d.id), { visibleTo });
    }

    onProgress('Migrating tasks...');
    const tasksSnap = await getDocs(collection(db, 'tasks'));
    for (const d of tasksSnap.docs) {
      const data = d.data();
      const lead = leadsData[data.leadId] || {};
      const visibleTo = [...new Set([
        data.createdBy, 
        data.assignedUserId, 
        lead.createdBy, 
        lead.assignedUserId
      ].filter(Boolean))];
      await updateDoc(doc(db, 'tasks', d.id), { visibleTo });
    }

    onProgress('Migrating quotations...');
    const quotsSnap = await getDocs(collection(db, 'quotations'));
    const quotsData = {};
    for (const d of quotsSnap.docs) {
      const data = d.data();
      const lead = leadsData[data.leadId] || {};
      const visibleTo = [...new Set([
        data.createdBy, 
        lead.createdBy, 
        lead.assignedUserId
      ].filter(Boolean))];
      quotsData[d.id] = { ...data, visibleTo };
      await updateDoc(doc(db, 'quotations', d.id), { visibleTo });
    }

    onProgress('Migrating sales orders...');
    const soSnap = await getDocs(collection(db, 'salesOrders'));
    const soData = {};
    for (const d of soSnap.docs) {
      const data = d.data();
      const quote = quotsData[data.quotationId] || { visibleTo: [] };
      const visibleTo = [...new Set([
        data.createdBy, 
        ...(quote.visibleTo || [])
      ].filter(Boolean))];
      soData[d.id] = { ...data, visibleTo };
      await updateDoc(doc(db, 'salesOrders', d.id), { visibleTo });
    }

    onProgress('Migrating purchase orders...');
    const poSnap = await getDocs(collection(db, 'purchaseOrders'));
    for (const d of poSnap.docs) {
      const data = d.data();
      const so = soData[data.salesOrderId] || { visibleTo: [] };
      const visibleTo = [...new Set([
        data.createdBy, 
        ...(so.visibleTo || [])
      ].filter(Boolean))];
      await updateDoc(doc(db, 'purchaseOrders', d.id), { visibleTo });
    }

    onProgress('Migration completed successfully!');
  } catch (error) {
    console.error(error);
    onProgress('Migration failed: ' + error.message);
  }
};

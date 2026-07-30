import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../services/firebase';

const getStoreCode = (store) => {
  if (store?.code?.trim()) return store.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (store?.name?.trim()) {
    const clean = store.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return clean.slice(0, 4) || 'STR';
  }
  return 'STR';
};

export const runReferenceNumberMigration = async (onProgress = () => {}) => {
  const log = [];
  const addLog = (msg) => {
    log.push(msg);
    onProgress(msg, [...log]);
  };

  addLog('🚀 Starting Reference Number Migration...');

  // 1. Fetch Stores
  const storesSnap = await getDocs(collection(db, 'stores'));
  const storeCodeMap = {};
  storesSnap.docs.forEach((d) => {
    const data = d.data();
    storeCodeMap[d.id] = getStoreCode(data);
  });
  addLog(`✅ Loaded ${Object.keys(storeCodeMap).length} stores.`);

  const currentYear = new Date().getFullYear();
  const yearKey = `Y${currentYear}`;

  // Track new SO numbers mapped by old SO number / ID for cascading updates to POs/Dockets
  const quotationNumMap = {};
  const salesOrderNumMap = {};

  // =========================================================================
  // A. LEADS
  // =========================================================================
  addLog('📦 Processing Leads...');
  const leadsSnap = await getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'asc')));
  const leadCounters = {};

  for (const docSnap of leadsSnap.docs) {
    const data = docSnap.data();
    const storeId = data.storeId || 'default';
    const storeCode = storeCodeMap[storeId] || 'STR';

    const lDate = data.createdAt?.toDate?.() ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
    const mm = String(lDate.getMonth() + 1).padStart(2, '0');
    const yy = String(lDate.getFullYear()).slice(-2);

    leadCounters[storeId] = (leadCounters[storeId] || 0) + 1;
    const seq = String(leadCounters[storeId]).padStart(4, '0');
    const newLeadNumber = `ENQ/${storeCode}/${mm}${yy}/${seq}`;

    await updateDoc(doc(db, 'leads', docSnap.id), { leadNumber: newLeadNumber });
    addLog(`   Updated Lead: ${data.leadNumber || docSnap.id} -> ${newLeadNumber}`);
  }

  // Update lead counters in Firestore
  const leadCounterPayload = {};
  Object.keys(leadCounters).forEach((storeId) => {
    leadCounterPayload[`${storeId}_${yearKey}`] = leadCounters[storeId];
  });
  await setDoc(doc(db, 'counters', 'leadCounter'), leadCounterPayload, { merge: true });

  // =========================================================================
  // B. QUOTATIONS
  // =========================================================================
  addLog('📦 Processing Quotations...');
  const qSnap = await getDocs(query(collection(db, 'quotations'), orderBy('createdAt', 'asc')));
  const qCounters = {};

  for (const docSnap of qSnap.docs) {
    const data = docSnap.data();
    const storeId = data.storeId || 'default';
    const storeCode = storeCodeMap[storeId] || 'STR';

    const qDate = data.createdAt?.toDate?.() ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
    const mm = String(qDate.getMonth() + 1).padStart(2, '0');
    const yy = String(qDate.getFullYear()).slice(-2);

    qCounters[storeId] = (qCounters[storeId] || 0) + 1;
    const seq = String(qCounters[storeId]).padStart(4, '0');
    const newQuotationNumber = `QN/${storeCode}/${mm}${yy}/${seq}`;

    if (data.quotationNumber) {
      quotationNumMap[data.quotationNumber] = newQuotationNumber;
    }
    quotationNumMap[docSnap.id] = newQuotationNumber;

    await updateDoc(doc(db, 'quotations', docSnap.id), { quotationNumber: newQuotationNumber });
    addLog(`   Updated Quotation: ${data.quotationNumber || docSnap.id} -> ${newQuotationNumber}`);
  }

  const qCounterPayload = {};
  Object.keys(qCounters).forEach((storeId) => {
    qCounterPayload[`${storeId}_${yearKey}`] = qCounters[storeId];
  });
  await setDoc(doc(db, 'counters', 'quotationCounters'), qCounterPayload, { merge: true });

  // =========================================================================
  // C. SALES ORDERS
  // =========================================================================
  addLog('📦 Processing Sales Orders...');
  const soSnap = await getDocs(query(collection(db, 'salesOrders'), orderBy('createdAt', 'asc')));
  const soCounters = {};

  for (const docSnap of soSnap.docs) {
    const data = docSnap.data();
    const storeId = data.storeId || 'default';
    const storeCode = storeCodeMap[storeId] || 'STR';

    const soDate = data.createdAt?.toDate?.() ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
    const mm = String(soDate.getMonth() + 1).padStart(2, '0');
    const yy = String(soDate.getFullYear()).slice(-2);

    soCounters[storeId] = (soCounters[storeId] || 0) + 1;
    const seq = String(soCounters[storeId]).padStart(4, '0');
    const newSalesOrderNumber = `SO/${storeCode}/${mm}${yy}/${seq}`;

    if (data.salesOrderNumber) {
      salesOrderNumMap[data.salesOrderNumber] = newSalesOrderNumber;
    }
    salesOrderNumMap[docSnap.id] = newSalesOrderNumber;

    const refQuotationNumber = quotationNumMap[data.quotationNumber] || data.quotationNumber || 'N/A';

    await updateDoc(doc(db, 'salesOrders', docSnap.id), {
      salesOrderNumber: newSalesOrderNumber,
      quotationNumber: refQuotationNumber,
    });
    addLog(`   Updated Sales Order: ${data.salesOrderNumber || docSnap.id} -> ${newSalesOrderNumber}`);
  }

  const soCounterPayload = {};
  Object.keys(soCounters).forEach((storeId) => {
    soCounterPayload[`${storeId}_${yearKey}`] = soCounters[storeId];
  });
  await setDoc(doc(db, 'counters', 'salesOrderCounters'), soCounterPayload, { merge: true });

  // =========================================================================
  // D. PURCHASE ORDERS
  // =========================================================================
  addLog('📦 Processing Purchase Orders...');
  const poSnap = await getDocs(query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'asc')));
  const poCounters = {};

  for (const docSnap of poSnap.docs) {
    const data = docSnap.data();
    const storeId = data.storeId || 'default';
    const storeCode = storeCodeMap[storeId] || 'STR';

    const poDate = data.createdAt?.toDate?.() ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
    const mm = String(poDate.getMonth() + 1).padStart(2, '0');
    const yy = String(poDate.getFullYear()).slice(-2);

    poCounters[storeId] = (poCounters[storeId] || 0) + 1;
    const seq = String(poCounters[storeId]).padStart(4, '0');
    const newPoNumber = `PO/${storeCode}/${mm}${yy}/${seq}`;

    const refSalesOrderNumber = salesOrderNumMap[data.salesOrderNumber] || data.salesOrderNumber || 'N/A';

    await updateDoc(doc(db, 'purchaseOrders', docSnap.id), {
      poNumber: newPoNumber,
      salesOrderNumber: refSalesOrderNumber,
    });
    addLog(`   Updated Purchase Order: ${data.poNumber || docSnap.id} -> ${newPoNumber}`);
  }

  const poCounterPayload = {};
  Object.keys(poCounters).forEach((storeId) => {
    poCounterPayload[`${storeId}_${yearKey}`] = poCounters[storeId];
  });
  await setDoc(doc(db, 'counters', 'poCounters'), poCounterPayload, { merge: true });

  // =========================================================================
  // E. DOCKETS
  // =========================================================================
  addLog('📦 Processing Dockets...');
  const docSnap = await getDocs(query(collection(db, 'dockets'), orderBy('createdAt', 'asc')));
  const docketCounters = {};

  for (const docSnapshot of docSnap.docs) {
    const data = docSnapshot.data();
    const storeId = data.storeId || 'default';
    const storeCode = storeCodeMap[storeId] || 'STR';

    const dDate = data.createdAt?.toDate?.() ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
    const mm = String(dDate.getMonth() + 1).padStart(2, '0');
    const yy = String(dDate.getFullYear()).slice(-2);

    docketCounters[storeId] = (docketCounters[storeId] || 0) + 1;
    const seq = String(docketCounters[storeId]).padStart(4, '0');
    const newDocketNumber = `DOC-${storeCode}/${mm}${yy}/${seq}`;

    const refSalesOrderNumber = salesOrderNumMap[data.salesOrderNumber] || data.salesOrderNumber || 'N/A';

    await updateDoc(doc(db, 'dockets', docSnapshot.id), {
      docketNumber: newDocketNumber,
      salesOrderNumber: refSalesOrderNumber,
    });
    addLog(`   Updated Docket: ${data.docketNumber || docSnapshot.id} -> ${newDocketNumber}`);
  }

  const docketCounterPayload = {};
  Object.keys(docketCounters).forEach((storeId) => {
    docketCounterPayload[`${storeId}_${yearKey}`] = docketCounters[storeId];
  });
  await setDoc(doc(db, 'counters', 'docketCounters'), docketCounterPayload, { merge: true });

  // =========================================================================
  // F. WARRANTIES
  // =========================================================================
  addLog('📦 Processing Warranty Certificates...');
  const colName = 'warranties';
  const warSnap = await getDocs(query(collection(db, colName), orderBy('createdAt', 'asc')));
  const warCounters = {};

  for (const docSnapshot of warSnap.docs) {
    const data = docSnapshot.data();
    const storeId = data.storeId || 'default';
    const storeCode = storeCodeMap[storeId] || 'STR';

    const wDate = data.createdAt?.toDate?.() ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
    const mm = String(wDate.getMonth() + 1).padStart(2, '0');
    const yy = String(wDate.getFullYear()).slice(-2);

    warCounters[storeId] = (warCounters[storeId] || 0) + 1;
    const seq = String(warCounters[storeId]).padStart(4, '0');
    const newWarrantyNumber = `WAR-${storeCode}/${mm}${yy}/${seq}`;

    await updateDoc(doc(db, colName, docSnapshot.id), {
      warrantyNumber: newWarrantyNumber,
    });
    addLog(`   Updated Warranty: ${data.warrantyNumber || docSnapshot.id} -> ${newWarrantyNumber}`);
  }

  const warCounterPayload = {};
  Object.keys(warCounters).forEach((storeId) => {
    warCounterPayload[`${storeId}_${yearKey}`] = warCounters[storeId];
  });
  await setDoc(doc(db, 'counters', 'warrantyCounters'), warCounterPayload, { merge: true });

  addLog('🎉 Migration Completed Successfully!');
  return log;
};

import { formatDate } from './helpers';

export const exportToExcel = (filename, headers, rows) => {
  const escapeCell = (cell) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' +
    [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => row.map(escapeCell).join(',')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getStoreName = (docObj, storesMap = {}, fallback = '') => {
  if (docObj?.storeName) return docObj.storeName;
  if (docObj?.storeId && storesMap?.[docObj.storeId]) return storesMap[docObj.storeId];
  if (docObj?.storeId && typeof storesMap === 'object' && storesMap.name && storesMap.id === docObj.storeId) return storesMap.name;
  return fallback || 'N/A';
};

export const exportQuotationsToExcel = (quotations, storesMap = {}, fallbackStoreName = '') => {
  const headers = [
    'Quotation Number',
    'Date',
    'Store Name',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Customer Address',
    'Products Subtotal (₹)',
    'Extra Costs Subtotal (₹)',
    'Grand Total Amount (₹)',
    'Extra Costs Breakdown',
    'Items Count',
    'Itemized Product Breakdown',
    'Prepared By',
    'Notes / Remarks'
  ];

  const rows = quotations.map(q => {
    const items = q.items || [];
    const itemBreakdown = items.map(i => `${i.name || ''} (Qty: ${i.qty || 1} @ ₹${i.unitPrice || 0} = ₹${(i.qty || 1) * (i.unitPrice || 0)})`).join(' | ');
    
    const extraCosts = q.extraCosts || [];
    const extraBreakdown = extraCosts.map(ec => `${ec.name || 'Extra Cost'}: ₹${ec.amount || 0}`).join(' | ');

    const qDate = q.createdAt?.toDate?.() ? q.createdAt.toDate() : (q.createdAt ? new Date(q.createdAt) : null);
    const preparedBy = typeof q.preparedBy === 'object' ? q.preparedBy?.name : (q.preparedBy || '');
    const storeName = getStoreName(q, storesMap, fallbackStoreName);

    return [
      q.quotationNumber || 'N/A',
      formatDate(qDate),
      storeName,
      q.customerDetails?.name || '',
      q.customerDetails?.phone || '',
      q.customerDetails?.email || '',
      q.customerDetails?.address || '',
      q.productsTotal || 0,
      q.extraCostsTotal || 0,
      q.grandTotal || q.totalAmount || 0,
      extraBreakdown,
      items.length,
      itemBreakdown,
      preparedBy,
      q.notes || ''
    ];
  });

  exportToExcel('Quotations_Export', headers, rows);
};

export const exportSalesOrdersToExcel = (salesOrders, storesMap = {}, fallbackStoreName = '') => {
  const headers = [
    'Sales Order Number',
    'Ref Quotation Number',
    'Order Date',
    'Target Delivery Date',
    'Store Name',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Customer Delivery Address',
    'Status',
    'Products Subtotal (₹)',
    'Extra Costs Subtotal (₹)',
    'Total Order Amount (₹)',
    'Advance Paid (₹)',
    'Balance Due (₹)',
    'Items Count',
    'Itemized Product Breakdown',
    'Prepared By',
    'Order Notes / Special Instructions'
  ];

  const rows = salesOrders.map(so => {
    const items = so.items || [];
    const itemBreakdown = items.map(i => `${i.name || ''} (Qty: ${i.qty || 1} @ ₹${i.unitPrice || 0} = ₹${(i.qty || 1) * (i.unitPrice || 0)})`).join(' | ');
    const orderDate = so.createdAt?.toDate?.() ? so.createdAt.toDate() : (so.createdAt ? new Date(so.createdAt) : null);

    const total = Number(so.totalAmount || 0);
    const advance = Number(so.advanceAmount || 0);
    const balance = total - advance;
    const preparedBy = typeof so.preparedBy === 'object' ? so.preparedBy?.name : (so.preparedBy || '');
    const storeName = getStoreName(so, storesMap, fallbackStoreName);

    return [
      so.salesOrderNumber || 'N/A',
      so.quotationNumber || 'N/A',
      formatDate(orderDate),
      formatDate(so.deliveryDate),
      storeName,
      so.customerDetails?.name || '',
      so.customerDetails?.phone || '',
      so.customerDetails?.email || '',
      so.customerDetails?.address || so.customerDetails?.deliveryAddress || '',
      so.status || 'Confirmed',
      so.productsTotal || 0,
      so.extraCostsTotal || 0,
      total,
      advance,
      balance,
      items.length,
      itemBreakdown,
      preparedBy,
      so.notes || ''
    ];
  });

  exportToExcel('Sales_Orders_Export', headers, rows);
};

export const exportPurchaseOrdersToExcel = (purchaseOrders, storesMap = {}, fallbackStoreName = '') => {
  const headers = [
    'PO Number',
    'Ref Sales Order Number',
    'Date Issued',
    'Required Delivery Date',
    'Store Name',
    'Vendor Name',
    'Vendor Phone',
    'Vendor Email',
    'Vendor Address',
    'Status',
    'Subtotal (₹)',
    'GST Tax Rate (%)',
    'GST Tax Amount (₹)',
    'Grand Total Amount (₹)',
    'Itemized Vendor Order Breakdown',
    'Shipping / Delivery Address',
    'Vendor Notes & Instructions'
  ];

  const rows = purchaseOrders.map(po => {
    const items = po.items || [];
    const itemDetails = items.map(i => `${i.name || ''} (Qty: ${i.qty || 1} @ ₹${i.unitPrice || 0} = ₹${i.totalAmount || i.amount || 0})`).join(' | ');
    const poDate = po.createdAt?.toDate?.() ? po.createdAt.toDate() : (po.createdAt ? new Date(po.createdAt) : null);
    const storeName = getStoreName(po, storesMap, fallbackStoreName);

    return [
      po.poNumber || 'N/A',
      po.salesOrderNumber || 'N/A',
      formatDate(poDate),
      formatDate(po.deliveryDate),
      storeName,
      po.vendor?.name || '',
      po.vendor?.phone || '',
      po.vendor?.email || '',
      po.vendor?.address || '',
      po.status || 'Issued',
      po.subtotal || 0,
      po.gstRate || 0,
      po.gstTotal || 0,
      po.grandTotal || 0,
      itemDetails,
      po.shippingAddress || '',
      po.notes || ''
    ];
  });

  exportToExcel('Purchase_Orders_Export', headers, rows);
};

export const exportDocketsToExcel = (dockets, storesMap = {}, fallbackStoreName = '') => {
  const headers = [
    'Docket Number',
    'Ref Sales Order Number',
    'Date Created',
    'Target Delivery Date',
    'Store Name',
    'Customer Name',
    'Customer Phone',
    'Product Item Name',
    'Quantity',
    'Template Used',
    'General Description & Instructions',
    'Custom Specifications & Dynamic Fields',
    'Attached Files List',
    'Production Status',
    'Store Address'
  ];

  const rows = dockets.map(d => {
    const docDate = d.createdAt?.toDate?.() ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
    let productName = '';
    let productQty = '';
    if (Array.isArray(d.productDetails)) {
      productName = d.productDetails.map(p => p.name).filter(Boolean).join(' | ');
      productQty = d.productDetails.map(p => p.qty).filter(Boolean).join(' | ');
    } else if (d.productDetails) {
      productName = d.productDetails.name || '';
      productQty = d.productDetails.qty || '';
    }

    const dynamicSpecs = Array.isArray(d.dynamicFields)
      ? d.dynamicFields.map(f => `${f.label || f.key}: ${f.description || 'Yes'}`).join(' | ')
      : '';

    const attachedPdfs = Array.isArray(d.attachedPdfs)
      ? d.attachedPdfs.map(ap => ap.title || 'Attachment').join(' | ')
      : '';

    const storeName = getStoreName(d, storesMap, fallbackStoreName);

    return [
      d.docketNumber || 'N/A',
      d.salesOrderNumber || 'N/A',
      formatDate(docDate),
      formatDate(d.deliveryDate),
      storeName,
      d.customerDetails?.name || '',
      d.customerDetails?.phone || '',
      productName,
      productQty,
      d.templateName || '',
      d.generalDescription || '',
      dynamicSpecs,
      attachedPdfs,
      d.productionStatus || 'Pending',
      d.storeAddress || ''
    ];
  });

  exportToExcel('Dockets_Export', headers, rows);
};

export const exportLeadsToExcel = (leads, stages = [], users = [], storesMap = {}, fallbackStoreName = '') => {
  const stagesMap = Array.isArray(stages)
    ? stages.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {})
    : (stages || {});

  const usersMap = Array.isArray(users)
    ? users.reduce((acc, u) => ({ ...acc, [u.id || u.uid]: u.displayName || u.name }), {})
    : (users || {});

  const headers = [
    'Lead Number',
    'Opportunity Title',
    'Store Name',
    'Customer Name',
    'Company',
    'Phone',
    'Email',
    'Address / Location',
    'Lead Source',
    'Stage',
    'Assigned Sales Rep',
    'Expected Value (₹)',
    'Expected Closing Date',
    'Next Follow-Up Date',
    'Priority',
    'Looking For',
    'Notes / Requirements',
    'Created Date'
  ];

  const rows = leads.map(l => {
    const lDate = l.createdAt?.toDate?.() ? l.createdAt.toDate() : (l.createdAt ? new Date(l.createdAt) : null);
    const cDate = l.expectedClosingDate?.toDate?.() ? l.expectedClosingDate.toDate() : (l.expectedClosingDate ? new Date(l.expectedClosingDate) : null);
    const fDate = l.nextFollowUp?.toDate?.() ? l.nextFollowUp.toDate() : (l.nextFollowUp ? new Date(l.nextFollowUp) : null);

    const stageName = stagesMap[l.stageId] || l.stage || '';
    const assigneeName = usersMap[l.assignedUserId] || l.assignedUserName || l.assignedTo || '';
    const storeName = getStoreName(l, storesMap, fallbackStoreName);

    return [
      l.leadNumber || 'N/A',
      l.opportunityTitle || '',
      storeName,
      l.customerName || l.name || '',
      l.company || '',
      l.phone || '',
      l.email || '',
      l.address || l.city || l.area || '',
      l.source || '',
      stageName,
      assigneeName,
      l.expectedRevenue || l.value || 0,
      formatDate(cDate),
      formatDate(fDate),
      l.priority ? `${l.priority} Star${l.priority > 1 ? 's' : ''}` : 'Normal',
      l.lookingFor || '',
      l.notes || l.requirement || '',
      formatDate(lDate)
    ];
  });

  exportToExcel('Leads_Export', headers, rows);
};

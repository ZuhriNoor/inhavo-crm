import { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Truck, FileText, Edit2, Calendar, Building2, User, MapPin } from 'lucide-react';
import { getVendors } from '../../services/vendorsService';
import { updatePurchaseOrder } from '../../services/purchaseOrdersService';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PurchaseOrderPDF } from '../../utils/purchaseOrderPdfTemplate';
import { formatDate } from '../../utils/helpers';

const STATUS_COLORS = {
  Issued: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'In Production': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

export default function PurchaseOrderEditModal({ isOpen, onClose, po, onSaved }) {
  const [isEditing, setIsEditing] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [includeGst, setIncludeGst] = useState(false);
  const [status, setStatus] = useState('Issued');
  
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && po) {
      setIsEditing(false); // Default to read-only details view!
      setSelectedVendorId(po.vendor?.id || po.vendorId || '');
      setDeliveryDate(po.deliveryDate || '');
      setNotes(po.notes || '');
      setStatus(po.status || 'Issued');
      setIncludeGst(Boolean(po.includeGst || (po.gstTotal && po.gstTotal > 0)));

      setItems(
        po.items?.length
          ? po.items.map(it => ({
              name: it.name || '',
              description: it.description || '',
              qty: Number(it.qty) || 1,
              unitPrice: Number(it.unitPrice) || 0,
              gstPercent: Number(it.gstPercent) || 0
            }))
          : []
      );

      fetchVendorsData();
    }
  }, [isOpen, po]);

  const fetchVendorsData = async () => {
    setLoadingVendors(true);
    try {
      const data = await getVendors();
      setVendors(data);
      if (!selectedVendorId && data.length > 0) {
        setSelectedVendorId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  };

  if (!isOpen || !po) return null;

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const selectedVendor = vendors.find(v => v.id === selectedVendorId) || po.vendor;

  // Financial Calculations
  const subtotal = items.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const gstTotal = includeGst ? items.reduce((acc, it) => {
    const itemAmount = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
    return acc + itemAmount * ((Number(it.gstPercent) || 0) / 100);
  }, 0) : 0;
  const grandTotal = subtotal + gstTotal;

  const updatedPoDataForPdf = {
    ...po,
    vendor: selectedVendor,
    deliveryDate,
    notes,
    status,
    includeGst,
    items: items.map(it => {
      const itemQty = Number(it.qty) || 1;
      const price = Number(it.unitPrice) || 0;
      const gst = includeGst ? (Number(it.gstPercent) || 0) : 0;
      const amount = itemQty * price;
      const gstAmount = amount * (gst / 100);
      return {
        ...it,
        qty: itemQty,
        unitPrice: price,
        gstPercent: gst,
        amount,
        gstAmount,
        totalAmount: amount + gstAmount
      };
    }),
    subtotal,
    gstTotal,
    grandTotal
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedVendorId && !selectedVendor) {
      alert('Please select a vendor.');
      return;
    }

    setSaving(true);
    try {
      await updatePurchaseOrder(po.id, updatedPoDataForPdf);
      if (onSaved) onSaved();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating Purchase Order:', err);
      alert('Failed to update Purchase Order');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = formatDate(po.createdAt);

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col text-gray-800 dark:text-slate-100 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {po.poNumber}
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${STATUS_COLORS[status] || STATUS_COLORS.Issued}`}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Created: {formattedDate} • Ref Sales Order: {po.salesOrderNumber || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Edit2 size={14} /> Edit PO
              </button>
            )}

            <PDFDownloadLink
              document={<PurchaseOrderPDF po={updatedPoDataForPdf} />}
              fileName={`${po.poNumber}.pdf`}
              className="px-3.5 py-1.5 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors hover:opacity-90 shadow-sm"
              style={{ background: '#875a7b' }}
            >
              {({ loading }) => loading ? 'Generating...' : <><FileText size={14} /> Download PDF</>}
            </PDFDownloadLink>

            <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingVendors ? (
            <div className="py-12 flex items-center justify-center text-gray-500">
              <RefreshCw className="animate-spin mr-2" size={20} /> Loading details...
            </div>
          ) : !isEditing ? (
            /* READ ONLY DETAILS VIEW */
            <div className="space-y-6">
              
              {/* Information Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Vendor Details */}
                <div className="bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700/60 p-4 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 font-semibold uppercase text-[11px] mb-1">
                    <Building2 size={14} /> Vendor Information
                  </div>
                  <p className="font-bold text-gray-900 dark:text-slate-100 text-sm">{selectedVendor?.name || 'N/A'}</p>
                  {selectedVendor?.contactPerson && <p className="text-gray-600 dark:text-slate-300">Attn: {selectedVendor.contactPerson}</p>}
                  {selectedVendor?.phone && <p className="text-gray-600 dark:text-slate-300">Phone: {selectedVendor.phone}</p>}
                  {selectedVendor?.address && <p className="text-gray-600 dark:text-slate-300">Address: {selectedVendor.address}</p>}
                  {selectedVendor?.gstin && <p className="text-gray-600 dark:text-slate-300">GSTIN: {selectedVendor.gstin}</p>}
                </div>

                {/* Delivery & Reference Info */}
                <div className="bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700/60 p-4 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 font-semibold uppercase text-[11px] mb-1">
                    <Calendar size={14} /> Order References
                  </div>
                  <p className="text-gray-600 dark:text-slate-300"><span className="font-medium text-gray-800 dark:text-slate-200">PO Number:</span> {po.poNumber}</p>
                  <p className="text-gray-600 dark:text-slate-300"><span className="font-medium text-gray-800 dark:text-slate-200">Sales Order Ref:</span> {po.salesOrderNumber || 'N/A'}</p>
                  <p className="text-amber-700 dark:text-amber-400 font-semibold mt-1">
                    Target Delivery Date: {deliveryDate ? formatDate(deliveryDate) : 'Not specified'}
                  </p>
                </div>

                {/* Customer Details */}
                <div className="bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700/60 p-4 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 font-semibold uppercase text-[11px] mb-1">
                    <User size={14} /> Customer Reference
                  </div>
                  <p className="font-bold text-gray-900 dark:text-slate-100 text-sm">{po.customerRef || po.customerDetails?.name || 'N/A'}</p>
                  {(po.customerAddress || po.customerDetails?.address) && (
                    <p className="text-gray-600 dark:text-slate-300 flex items-start gap-1 mt-1">
                      <MapPin size={12} className="shrink-0 mt-0.5 text-gray-400" /> {po.customerAddress || po.customerDetails?.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Products Included ({items.length})
                </h3>
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium w-12 text-center">#</th>
                        <th className="px-4 py-3 font-medium w-1/3">Product Name</th>
                        <th className="px-4 py-3 font-medium">Description / Specs</th>
                        <th className="px-4 py-3 font-medium w-20 text-center">Qty</th>
                        <th className="px-4 py-3 font-medium w-28 text-right">Unit Price (₹)</th>
                        {includeGst && <th className="px-4 py-3 font-medium w-20 text-center">GST %</th>}
                        <th className="px-4 py-3 font-medium w-28 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                      {items.map((it, idx) => {
                        const itemQty = Number(it.qty) || 0;
                        const price = Number(it.unitPrice) || 0;
                        const lineAmt = itemQty * price;

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-center text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{it.name}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-slate-300 text-xs">{it.description || '-'}</td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-slate-100">{itemQty}</td>
                            <td className="px-4 py-3 text-right text-gray-600 dark:text-slate-300">{price > 0 ? `₹${price.toLocaleString('en-IN')}` : '-'}</td>
                            {includeGst && <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-300">{it.gstPercent > 0 ? `${it.gstPercent}%` : '-'}</td>}
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{lineAmt > 0 ? `₹${lineAmt.toLocaleString('en-IN')}` : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary Box */}
              {subtotal > 0 && (
                <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-4 space-y-1 text-right w-full sm:w-72 ml-auto">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {includeGst && gstTotal > 0 && (
                    <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                      <span>GST Amount:</span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">₹{gstTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-purple-950 dark:text-purple-200 pt-1.5 border-t border-purple-200/50 dark:border-purple-800/40">
                    <span>Total Amount:</span>
                    <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {notes && (
                <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Vendor Instructions & Notes</p>
                  <p className="text-xs text-amber-900 dark:text-amber-200 whitespace-pre-line">{notes}</p>
                </div>
              )}

            </div>
          ) : (
            /* EDITABLE FORM VIEW */
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Vendor, Status & Delivery Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Vendor / Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 font-medium focus:outline-none focus:border-purple-500"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.contactPerson ? `(${v.contactPerson})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Order Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-purple-500"
                  >
                    <option value="Issued">Issued</option>
                    <option value="In Production">In Production</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Target Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Items Section Header & GST Checkbox */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Purchase Order Products
                  </h3>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-300 cursor-pointer select-none bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeGst}
                      onChange={(e) => setIncludeGst(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    Add GST / Tax to Purchase Order
                  </label>
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium w-1/4">Product Name</th>
                        <th className="px-4 py-3 font-medium">Description / Specs</th>
                        <th className="px-4 py-3 font-medium w-20 text-center">Qty</th>
                        <th className="px-4 py-3 font-medium w-28 text-right">Unit Price (₹)</th>
                        {includeGst && <th className="px-4 py-3 font-medium w-24 text-center">GST %</th>}
                        <th className="px-4 py-3 font-medium w-28 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                      {items.map((it, idx) => {
                        const itemQty = Number(it.qty) || 0;
                        const price = Number(it.unitPrice) || 0;
                        const lineAmt = itemQty * price;

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 align-top font-medium text-gray-900 dark:text-slate-100">
                              {it.name}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <input
                                type="text"
                                value={it.description}
                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                placeholder="Specifications, wood, fabric..."
                                className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                              />
                            </td>
                            <td className="px-4 py-3 align-top text-center">
                              <input
                                type="number"
                                min={1}
                                value={it.qty}
                                onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1.5 text-center bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-purple-500"
                              />
                            </td>
                            <td className="px-4 py-3 align-top text-right">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={it.unitPrice}
                                onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1.5 text-right bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-purple-500"
                              />
                            </td>
                            {includeGst && (
                              <td className="px-4 py-3 align-top text-center">
                                <select
                                  value={it.gstPercent || 0}
                                  onChange={(e) => handleItemChange(idx, 'gstPercent', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1.5 text-center bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-900 dark:text-slate-100 font-medium focus:outline-none focus:border-purple-500"
                                >
                                  <option value={0}>0%</option>
                                  <option value={5}>5%</option>
                                  <option value={12}>12%</option>
                                  <option value={18}>18%</option>
                                  <option value={28}>28%</option>
                                </select>
                              </td>
                            )}
                            <td className="px-4 py-3 align-top text-right font-medium text-gray-900 dark:text-slate-100">
                              {lineAmt > 0 ? `₹${lineAmt.toLocaleString('en-IN')}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary Box */}
              {subtotal > 0 && (
                <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-4 space-y-1 text-right">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {includeGst && gstTotal > 0 && (
                    <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                      <span>GST Tax Amount:</span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">₹{gstTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-purple-950 dark:text-purple-200 pt-1.5 border-t border-purple-200/50 dark:border-purple-800/40">
                    <span>Total PO Amount:</span>
                    <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* Vendor Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Vendor Notes & Instructions
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions, delivery terms..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel Editing
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-colors shadow-sm"
                  style={{ background: '#875a7b' }}
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  {saving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer for Read-Only Mode */}
        {!isEditing && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50/50 dark:bg-slate-800/80 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-colors shadow-sm"
              style={{ background: '#875a7b' }}
            >
              <Edit2 size={16} /> Edit Purchase Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Save, FileText, CheckCircle, RefreshCw, Truck } from 'lucide-react';
import { getVendors } from '../../services/vendorsService';
import { createPurchaseOrder } from '../../services/purchaseOrdersService';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PurchaseOrderPDF } from '../../utils/purchaseOrderPdfTemplate';
import { useStore } from '../../contexts/StoreContext';

export default function PurchaseOrderModal({ isOpen, onClose, saleOrder, existingPurchaseOrders = [], onPoCreated }) {
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [includeGst, setIncludeGst] = useState(false);
  
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedPo, setSavedPo] = useState(null);
  
  const { availableStores } = useStore();
  const currentStore = availableStores.find(s => s.id === saleOrder?.storeId);

  useEffect(() => {
    if (isOpen) {
      setSavedPo(null);
      setIncludeGst(false);
      setDeliveryDate(saleOrder?.deliveryDate || '');
      fetchVendorsData();
      
      // Initialize items from saleOrder (NO PRICING default, editable!) & check if PO already exists
      if (saleOrder?.items) {
        setItems(saleOrder.items.map((it) => {
          const assignedPo = (existingPurchaseOrders || []).find(po =>
            po.status !== 'Cancelled' &&
            po.items?.some(pi => pi.name === it.name)
          );
          if (assignedPo) {
            return {
              name: it.name || '',
              description: it.description || '',
              qty: it.qty || 1,
              unitPrice: Number(it.unitPrice) || 0,
              gstPercent: 18,
              selected: false,
              disabled: true,
              assignedPoNumber: assignedPo.poNumber,
              assignedVendorName: assignedPo.vendor?.name
            };
          }
          return {
            name: it.name || '',
            description: it.description || '',
            qty: it.qty || 1,
            unitPrice: Number(it.unitPrice) || 0,
            gstPercent: 18,
            selected: true,
            disabled: false
          };
        }));
      }
    }
  }, [isOpen]);

  const fetchVendorsData = async () => {
    setLoadingVendors(true);
    try {
      const data = await getVendors();
      setVendors(data);
      if (data.length > 0) {
        setSelectedVendorId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  };

  if (!isOpen) return null;

  const handleItemToggle = (index) => {
    if (items[index].disabled) return;
    const updated = [...items];
    updated[index].selected = !updated[index].selected;
    setItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    if (items[index].disabled) return;
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  // Financial Calculations for selected items
  const selectedItems = items.filter(it => it.selected && !it.disabled);
  const subtotal = selectedItems.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const gstTotal = includeGst ? selectedItems.reduce((acc, it) => {
    const itemAmount = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
    return acc + itemAmount * ((Number(it.gstPercent) || 0) / 100);
  }, 0) : 0;
  const grandTotal = subtotal + gstTotal;

  const handleSave = async () => {
    if (!selectedVendorId) {
      alert('Please select a vendor.');
      return;
    }
    if (selectedItems.length === 0) {
      alert('Please select at least one item for this purchase order.');
      return;
    }

    setSaving(true);
    try {
      const poData = {
        salesOrderId: saleOrder.id,
        salesOrderNumber: saleOrder.salesOrderNumber,
        storeId: saleOrder.storeId,
        storeName: currentStore?.name || 'Inhavo',
        storeAddress: currentStore?.address || '',
        storeGstin: currentStore?.gstin || '',
        customerRef: saleOrder.customerDetails?.name || '',
        customerAddress: saleOrder.customerDetails?.address || saleOrder.customerDetails?.deliveryAddress || '',
        vendor: selectedVendor,
        deliveryDate,
        notes,
        includeGst,
        items: selectedItems.map(({ name, description, qty, unitPrice, gstPercent }) => {
          const itemQty = Number(qty) || 1;
          const price = Number(unitPrice) || 0;
          const gst = includeGst ? (Number(gstPercent) || 0) : 0;
          const amount = itemQty * price;
          const gstAmount = amount * (gst / 100);
          return {
            name,
            description,
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
        grandTotal,
        status: 'Issued'
      };

      const result = await createPurchaseOrder(poData);
      setSavedPo({ ...poData, ...result });
      if (onPoCreated) onPoCreated();
    } catch (err) {
      console.error('Error creating Purchase Order:', err);
      alert('Failed to create Purchase Order');
    } finally {
      setSaving(false);
    }
  };

  const allItemsAssigned = items.length > 0 && items.every(it => it.disabled);

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col text-gray-800 dark:text-slate-100 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Create Purchase Order</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Ref SO: {saleOrder?.salesOrderNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!savedPo ? (
            loadingVendors ? (
              <div className="py-12 flex items-center justify-center text-gray-500">
                <RefreshCw className="animate-spin mr-2" size={20} /> Loading vendors list...
              </div>
            ) : (
              <div className="space-y-6">
                
                {allItemsAssigned && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-3">
                    <Truck size={20} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-bold text-sm">All Items Already Have Purchase Orders</p>
                      <p className="mt-0.5">Every item in this order has an active PO assigned. To re-issue a PO for an item, delete its existing purchase order first.</p>
                    </div>
                  </div>
                )}

                {/* Vendor & Delivery Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Select Vendor <span className="text-red-500">*</span>
                    </label>
                    {vendors.length === 0 ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 rounded-lg text-xs">
                        No vendors configured. Please configure vendors in <strong>Admin Settings → Vendors</strong> first.
                      </div>
                    ) : (
                      <select
                        value={selectedVendorId}
                        onChange={(e) => setSelectedVendorId(e.target.value)}
                        disabled={allItemsAssigned}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-gray-900 dark:text-slate-100 font-medium disabled:opacity-50"
                      >
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} {v.contactPerson ? `(${v.contactPerson})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedVendor && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700/30 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700/50 space-y-0.5">
                        <p className="font-medium text-gray-800 dark:text-slate-200">{selectedVendor.name}</p>
                        {selectedVendor.phone && <p>Phone: {selectedVendor.phone}</p>}
                        {selectedVendor.address && <p>Address: {selectedVendor.address}</p>}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Required Delivery Date
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      disabled={allItemsAssigned}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-gray-900 dark:text-slate-100 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Items to Order Header & GST Checkbox */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Items to Include in Purchase Order
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
                          <th className="px-3 py-3 font-medium w-10 text-center">Inc</th>
                          <th className="px-3 py-3 font-medium w-1/4">Item Name</th>
                          <th className="px-3 py-3 font-medium">Description / Specs</th>
                          <th className="px-3 py-3 font-medium w-20 text-center">Qty</th>
                          <th className="px-3 py-3 font-medium w-28 text-right">Unit Price (₹)</th>
                          {includeGst && <th className="px-3 py-3 font-medium w-24 text-center">GST %</th>}
                          <th className="px-3 py-3 font-medium w-28 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                        {items.map((it, idx) => {
                          const itemQty = Number(it.qty) || 0;
                          const price = Number(it.unitPrice) || 0;
                          const lineAmt = itemQty * price;

                          return (
                            <tr key={idx} className={it.disabled ? 'bg-amber-50/20 dark:bg-amber-900/10' : (!it.selected ? 'opacity-40 bg-gray-50/50 dark:bg-slate-900/30' : '')}>
                              <td className="px-3 py-3 text-center align-middle">
                                <input
                                  type="checkbox"
                                  checked={it.selected}
                                  disabled={it.disabled}
                                  onChange={() => handleItemToggle(idx)}
                                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 disabled:opacity-40"
                                />
                              </td>
                              <td className="px-3 py-3 align-top">
                                <p className="font-medium text-gray-900 dark:text-slate-100">{it.name}</p>
                                {it.disabled && (
                                  <span className="inline-block mt-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                    PO Issued: {it.assignedPoNumber} ({it.assignedVendorName})
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <input
                                  type="text"
                                  value={it.description}
                                  disabled={it.disabled}
                                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                  placeholder="Specifications, wood, fabric..."
                                  className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-900 dark:text-slate-100 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-3 py-3 align-top text-center">
                                <input
                                  type="number"
                                  min={1}
                                  value={it.qty}
                                  disabled={it.disabled}
                                  onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1.5 text-center bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-900 dark:text-slate-100 font-semibold disabled:opacity-50"
                                />
                              </td>
                              <td className="px-3 py-3 align-top text-right">
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={it.unitPrice}
                                  disabled={it.disabled}
                                  onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1.5 text-right bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-900 dark:text-slate-100 font-semibold disabled:opacity-50"
                                />
                              </td>
                              {includeGst && (
                                <td className="px-3 py-3 align-top text-center">
                                  <select
                                    value={it.gstPercent || 0}
                                    disabled={it.disabled}
                                    onChange={(e) => handleItemChange(idx, 'gstPercent', parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1.5 text-center bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-900 dark:text-slate-100 disabled:opacity-50 font-medium"
                                  >
                                    <option value={0}>0%</option>
                                    <option value={5}>5%</option>
                                    <option value={12}>12%</option>
                                    <option value={18}>18%</option>
                                    <option value={28}>28%</option>
                                  </select>
                                </td>
                              )}
                              <td className="px-3 py-3 align-top text-right font-medium text-gray-900 dark:text-slate-100">
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
                {selectedItems.length > 0 && subtotal > 0 && (
                  <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-4 space-y-1 text-right">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {gstTotal > 0 && (
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
                    Vendor Notes & Special Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add special packaging, quality check requirements, or instructions for the vendor..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-gray-900 dark:text-slate-100"
                  />
                </div>

              </div>
            )
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Purchase Order Created!</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-6">PO #{savedPo.poNumber} issued to {savedPo.vendor?.name}.</p>
              
              <PDFDownloadLink
                document={<PurchaseOrderPDF po={savedPo} />}
                fileName={`${savedPo.poNumber}.pdf`}
                className="px-6 py-2.5 text-white rounded-lg font-medium shadow flex items-center gap-2 hover:opacity-90 transition-colors"
                style={{ background: '#875a7b' }}
              >
                {({ loading }) => loading ? 'Generating PDF...' : <><FileText size={18} /> Download Purchase Order PDF</>}
              </PDFDownloadLink>
            </div>
          )}
        </div>

        {/* Footer */}
        {!savedPo && !loadingVendors && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50/50 dark:bg-slate-800/80 rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || vendors.length === 0}
              className="px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-colors"
              style={{ background: '#875a7b' }}
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? 'Creating PO...' : 'Create Purchase Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

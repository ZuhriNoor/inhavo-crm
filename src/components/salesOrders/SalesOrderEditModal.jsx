import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, RefreshCw, ShoppingCart, Image as ImageIcon } from 'lucide-react';
import { updateSaleOrder } from '../../services/salesOrdersService';
import { compressImageFile } from '../../utils/imageUtils';
import DateInput from '../shared/DateInput';

export default function SalesOrderEditModal({ isOpen, onClose, saleOrder, onSaved }) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  
  const [items, setItems] = useState([]);
  const [extraCosts, setExtraCosts] = useState([]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && saleOrder) {
      setCustomerName(saleOrder.customerDetails?.name || '');
      setCustomerPhone(saleOrder.customerDetails?.phone || '');
      setCustomerEmail(saleOrder.customerDetails?.email || '');
      setCustomerAddress(saleOrder.customerDetails?.address || saleOrder.customerDetails?.deliveryAddress || '');
      setDeliveryDate(saleOrder.deliveryDate || '');

      setItems(
        saleOrder.items?.length
          ? saleOrder.items.map(it => ({
              name: it.name || '',
              description: it.description || '',
              photo: it.photo || '',
              qty: Number(it.qty) || 1,
              unitPrice: Number(it.unitPrice) || 0
            }))
          : [{ name: '', description: '', photo: '', qty: 1, unitPrice: 0 }]
      );

      setExtraCosts(
        saleOrder.extraCosts?.length
          ? saleOrder.extraCosts.map(c => ({
              label: c.label || '',
              amount: Number(c.amount) || 0
            }))
          : []
      );
    }
  }, [isOpen, saleOrder]);

  if (!isOpen || !saleOrder) return null;

  // Item handlers
  const handleAddItem = () => {
    setItems(prev => [...prev, { name: '', description: '', photo: '', qty: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert('Sales order must have at least one item.');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handlePhotoUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 400, 400, 0.6);
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = [...items];
        updated[index].photo = reader.result;
        setItems(updated);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error('Error compressing image:', err);
    }
  };

  // Extra cost handlers
  const handleAddExtraCost = () => {
    setExtraCosts(prev => [...prev, { label: '', amount: 0 }]);
  };

  const handleRemoveExtraCost = (index) => {
    setExtraCosts(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtraCostChange = (index, field, value) => {
    const updated = [...extraCosts];
    updated[index][field] = value;
    setExtraCosts(updated);
  };

  // Calculations
  const productsTotal = items.reduce(
    (acc, curr) => acc + (Number(curr.qty) || 0) * (Number(curr.unitPrice) || 0),
    0
  );
  const extraCostsTotal = extraCosts.reduce(
    (acc, curr) => acc + (Number(curr.amount) || 0),
    0
  );
  const grandTotal = productsTotal + extraCostsTotal;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) return alert('Customer Name is required');
    if (items.some(it => !it.name.trim())) return alert('All items must have a name');

    setSaving(true);
    try {
      const orderPayload = {
        ...saleOrder,
        customerDetails: {
          ...saleOrder.customerDetails,
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
          address: customerAddress.trim(),
          deliveryAddress: customerAddress.trim()
        },
        deliveryDate: deliveryDate || '',
        items: items.map(it => ({
          name: it.name.trim(),
          description: it.description?.trim() || '',
          photo: it.photo || '',
          qty: Number(it.qty) || 1,
          unitPrice: Number(it.unitPrice) || 0
        })),
        extraCosts: extraCosts.map(c => ({
          label: c.label.trim(),
          amount: Number(c.amount) || 0
        })),
      };

      await updateSaleOrder(saleOrder.id, orderPayload);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error updating Sales Order:', err);
      alert('Failed to update Sales Order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col text-gray-800 dark:text-slate-100 transition-colors">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Edit Sales Order</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Order: {saleOrder.salesOrderNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Customer Details & Delivery Date */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">
              Customer Information & Delivery
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Target Delivery Date</label>
                <DateInput
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                Order Items
              </h3>
            </div>

            <div className="space-y-4">
              {items.map((it, idx) => {
                const lineTotal = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);

                return (
                  <div key={idx} className="bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-4">
                      {/* Photo Upload */}
                      <div className="shrink-0">
                        <label className="block relative w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 overflow-hidden group">
                          {it.photo ? (
                            <>
                              <img src={it.photo} alt="Item" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">Change</div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center text-gray-400">
                              <ImageIcon size={18} />
                              <span className="text-[9px] mt-0.5">Photo</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(idx, e)}
                          />
                        </label>
                      </div>

                      {/* Inputs */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Item Name *</label>
                          <input
                            type="text"
                            required
                            value={it.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            placeholder="e.g. 3-Seater Chesterfield Sofa"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Quantity</label>
                          <input
                            type="number"
                            min={1}
                            value={it.qty}
                            onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Unit Price (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={it.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors mt-1"
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Description & Line Subtotal */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-gray-200/60 dark:border-slate-700/60">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Specifications / fabric / dimensions details..."
                        className="w-full sm:flex-1 px-3 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs text-gray-900 dark:text-slate-100"
                      />
                      <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 shrink-0">
                        Line Total: ₹{lineTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full sm:w-auto px-4 py-2 border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
          </div>

          {/* Extra Costs */}
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                Extra Charges / Discounts
              </h3>
              <button
                type="button"
                onClick={handleAddExtraCost}
                className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> Add Charge
              </button>
            </div>

            {extraCosts.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No extra charges or discounts added.</p>
            ) : (
              <div className="space-y-2">
                {extraCosts.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/80 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                    <input
                      type="text"
                      placeholder="e.g. Delivery / Installation Charges"
                      value={c.label}
                      onChange={(e) => handleExtraCostChange(idx, 'label', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs text-gray-900 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      value={c.amount}
                      onChange={(e) => handleExtraCostChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs text-gray-900 dark:text-slate-100 font-semibold text-right"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraCost(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-4 space-y-1.5 text-right">
            <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
              <span>Products Subtotal:</span>
              <span className="font-semibold text-gray-900 dark:text-slate-100">₹{productsTotal.toLocaleString('en-IN')}</span>
            </div>
            {extraCostsTotal !== 0 && (
              <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                <span>Extra Charges:</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">₹{extraCostsTotal.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-purple-950 dark:text-purple-200 pt-2 border-t border-purple-200/50 dark:border-purple-800/40">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-colors shadow-sm"
              style={{ background: '#875a7b' }}
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? 'Saving Changes...' : 'Save Sales Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

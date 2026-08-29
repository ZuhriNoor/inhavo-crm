import { useState } from 'react';
import { X, RefreshCw, Wallet } from 'lucide-react';
import { addSalesOrderPayment } from '../../services/salesOrdersService';
import DateInput from '../shared/DateInput';

export default function SalesOrderPaymentModal({ isOpen, onClose, orderId, onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return alert('Enter a valid payment amount');

    setSaving(true);
    try {
      await addSalesOrderPayment(orderId, {
        amount: Number(amount),
        date,
        method: method.trim(),
        note: note.trim(),
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col text-gray-800 dark:text-slate-100 transition-colors">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
              <Wallet size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Record Payment</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Amount (₹) *</label>
            <input
              type="number"
              min={0}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Date *</label>
            <DateInput
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Method</label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="e.g. Cash, UPI, Bank Transfer"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Note</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (e.g. Advance payment)"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Wallet size={16} />}
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

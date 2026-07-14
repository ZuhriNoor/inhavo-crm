// QuotationModal — generates a quotation and triggers PDF
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { X, Plus, Trash2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { createQuotation } from '../../services/quotationsService';
import { useAuth } from '../../contexts/AuthContext';
import QuotationPDF from '../../utils/pdfTemplate';

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all';

const QuotationModal = ({ lead, storeId, onClose, onSaved }) => {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const { register, control, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      customerName: lead?.customerName || '',
      customerEmail: lead?.email || '',
      customerPhone: lead?.phone || '',
      customerAddress: lead?.address || '',
      notes: '',
      items: [{ name: '', description: '', qty: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  const totalAmount = items.reduce((sum, item) => {
    return sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
  }, 0);

  const onSubmit = async (data) => {
    setGenerating(true);
    try {
      const payload = {
        leadId: lead?.id,
        storeId,
        customerDetails: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
          address: data.customerAddress,
        },
        items: data.items,
        notes: data.notes,
        totalAmount,
        createdBy: user?.uid,
        pdfUrl: '',
      };

      // Create Firestore record first to get an ID
      const quotationId = await createQuotation(payload);

      // Generate PDF blob
      const pdfDoc = <QuotationPDF quotation={{ ...payload, id: quotationId }} />;
      const blob = await pdf(pdfDoc).toBlob();

      // Create a local blob URL
      const blobUrl = URL.createObjectURL(blob);
      
      // Auto-trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Quotation_${quotationId.slice(-6).toUpperCase()}.pdf`;
      link.click();

      setPdfUrl(blobUrl);
      onSaved?.();
    } catch (err) {
      console.error('Failed to generate quotation:', err);
    } finally {
      setGenerating(false);
    }
  };

  // If PDF generated, show success
  if (pdfUrl) {
    return (
      <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Quotation Generated!</h3>
          <p className="text-sm text-gray-500 mb-6">Your PDF is ready to download.</p>
          <div className="flex flex-col gap-2">
            <a
              href={pdfUrl}
              download="Quotation.pdf"
              className="px-6 py-2.5 text-sm text-white font-medium rounded-lg"
              style={{ background: '#875a7b' }}
            >
              Download Again
            </a>
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Generate Quotation</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">
            {/* Customer Details */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Customer Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input {...register('customerName', { required: true })} className={inputCls} placeholder="Customer Name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input {...register('customerEmail')} type="email" className={inputCls} placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input {...register('customerPhone')} className={inputCls} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input {...register('customerAddress')} className={inputCls} placeholder="Address" />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Products / Services
                </h3>
                <button
                  type="button"
                  onClick={() => append({ name: '', description: '', qty: 1, unitPrice: 0 })}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
                >
                  <Plus size={13} /> Add Item
                </button>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-medium text-gray-400 mb-2 px-1">
                <span>Item</span>
                <span className="w-16 text-center">Qty</span>
                <span className="w-24 text-center">Unit Price</span>
                <span className="w-20 text-right">Total</span>
              </div>

              {fields.map((field, idx) => {
                const rowTotal = (Number(items[idx]?.qty) || 0) * (Number(items[idx]?.unitPrice) || 0);
                return (
                  <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 mb-2 items-start">
                    <div className="space-y-1">
                      <input
                        {...register(`items.${idx}.name`, { required: true })}
                        className={inputCls}
                        placeholder="Product name"
                      />
                      <input
                        {...register(`items.${idx}.description`)}
                        className={inputCls}
                        placeholder="Description (optional)"
                      />
                    </div>
                    <input
                      {...register(`items.${idx}.qty`)}
                      type="number"
                      min="1"
                      className={inputCls + ' w-16 text-center'}
                    />
                    <input
                      {...register(`items.${idx}.unitPrice`)}
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls + ' w-24 text-right'}
                    />
                    <div className="flex items-center justify-end gap-1 pt-2">
                      <span className="text-sm font-medium text-gray-700 w-16 text-right">
                        ₹{rowTotal.toLocaleString('en-IN')}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-500">Total:</span>
                <span className="text-base font-bold text-gray-900">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                {...register('notes')}
                rows={2}
                className={inputCls + ' resize-none'}
                placeholder="Terms, conditions, or additional notes…"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || generating}
              className="px-5 py-2 text-sm text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-60"
              style={{ background: '#875a7b' }}
            >
              {generating ? (
                <><span className="spinner w-3 h-3 border-white" /> Generating PDF…</>
              ) : (
                'Generate & Download'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuotationModal;

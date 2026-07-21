// QuotationModal — generates a quotation and triggers PDF
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { X, Plus, Trash2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { createQuotation, updateQuotation } from '../../services/quotationsService';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import QuotationPDF from '../../utils/pdfTemplate';

const inputCls =
  'w-full px-3 py-2 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all';

const defaultTerms = `• A deposit of 50% of the total amount is required to confirm your order, 30% after completion of production and balance 20% is payable before delivery.
• Delivery Location Should be Accessible by Vehicle
• Delivery will be till the Ground Floor unless there is a Service Lift
• Sold Products Cannot be exchanged or cancelled.
• Unloading Charges of the Trade Union must be paid by the Customer
• Gst And Transportation extra`;

const QuotationModal = ({ lead, storeId, editingQuotation, onClose, onSaved }) => {
  const { user, profile } = useAuth();
  const { availableStores } = useStore();
  const [generating, setGenerating] = useState(false);
  const [submitAction, setSubmitAction] = useState('download'); // 'save' | 'download'
  const [pdfUrl, setPdfUrl] = useState('');

  const currentStore = availableStores.find((s) => s.id === storeId);
  const storeDefaultTerms = currentStore?.defaultTerms || defaultTerms;

  const { register, control, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      customerName: lead?.customerName || '',
      customerEmail: lead?.email || '',
      customerPhone: lead?.phone || '',
      customerAddress: lead?.address || '',
      notes: storeDefaultTerms,
      items: [{ name: '', description: '', photo: '', qty: 1, unitPrice: 0 }],
    },
  });

  // Pre-fill if editing or reset with defaults if new
  useEffect(() => {
    if (editingQuotation) {
      reset({
        customerName: editingQuotation.customerDetails?.name || '',
        customerEmail: editingQuotation.customerDetails?.email || '',
        customerPhone: editingQuotation.customerDetails?.phone || '',
        customerAddress: editingQuotation.customerDetails?.address || '',
        notes: editingQuotation.notes || '',
        items: editingQuotation.items?.length ? editingQuotation.items : [{ name: '', description: '', photo: '', qty: 1, unitPrice: 0 }],
      });
    } else {
      reset({
        customerName: lead?.customerName || '',
        customerEmail: lead?.email || '',
        customerPhone: lead?.phone || '',
        customerAddress: lead?.address || '',
        notes: storeDefaultTerms,
        items: [{ name: '', description: '', photo: '', qty: 1, unitPrice: 0 }],
      });
    }
  }, [editingQuotation, lead, storeDefaultTerms, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  const handlePhotoChange = (idx, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue(`items.${idx}.photo`, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const totalAmount = (items || []).reduce(
    (acc, curr) => acc + (Number(curr.qty) || 0) * (Number(curr.unitPrice) || 0),
    0
  );

  const onSubmit = async (data) => {
    setGenerating(true);
    try {
      const formattedItems = (data.items || []).map((item) => {
        const qty = Number(item.qty) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        return {
          name: item.name,
          description: item.description || '',
          photo: item.photo || '',
          qty,
          unitPrice,
          totalPrice: qty * unitPrice,
        };
      });

      const payload = {
        leadId: lead?.id || editingQuotation?.leadId || null,
        storeId,
        customerDetails: {
          name: data.customerName,
          email: data.customerEmail || '',
          phone: data.customerPhone || '',
          address: data.customerAddress || '',
        },
        items: formattedItems,
        totalAmount,
        notes: data.notes || '',
        createdBy: user?.uid,
        preparedBy: {
          name: profile?.displayName || user?.email || 'Unknown User',
          phone: profile?.phone || '',
          location: profile?.location || '',
        },
        storeAddress: currentStore?.address || '',
        storeBankDetails: currentStore?.bankDetails || '',
        pdfUrl: '',
      };

      let id = editingQuotation?.id;
      let quotationNumber = editingQuotation?.quotationNumber;

      if (editingQuotation) {
        // Update existing record
        await updateQuotation(id, payload);
      } else {
        // Create new Firestore record to get an ID and sequential number
        const result = await createQuotation(payload);
        id = result.id;
        quotationNumber = result.quotationNumber;
      }

      if (submitAction === 'save') {
        setGenerating(false);
        onSaved?.();
        onClose?.();
        return;
      }

      // Generate PDF blob
      const pdfDoc = <QuotationPDF quotation={{ ...payload, id, quotationNumber }} />;
      const blob = await pdf(pdfDoc).toBlob();

      // Create a local blob URL
      const blobUrl = URL.createObjectURL(blob);
      
      // Auto-trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${data.customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${quotationNumber}.pdf`;
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
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-emerald-950/60 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-2">Quotation Generated!</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Your PDF is ready to download.</p>
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
              className="px-6 py-2.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
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
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
            {editingQuotation ? 'Edit Quotation' : 'New Quotation'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">
            {/* Customer Details */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-3">
                Customer Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Name</label>
                  <input {...register('customerName', { required: true })} className={inputCls} placeholder="Customer Name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Email</label>
                  <input {...register('customerEmail')} type="email" className={inputCls} placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Phone</label>
                  <input {...register('customerPhone')} className={inputCls} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Address</label>
                  <input {...register('customerAddress')} className={inputCls} placeholder="Address" />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                  Products / Services
                </h3>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 dark:text-slate-400 mb-2 px-1">
                <span className="col-span-3">Photo</span>
                <span className="col-span-4">Item Details</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-center">Rate</span>
                <span className="col-span-1 text-right">Total</span>
              </div>

              {fields.map((field, idx) => {
                const rowTotal = (Number(items[idx]?.qty) || 0) * (Number(items[idx]?.unitPrice) || 0);
                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 mb-2 items-start">
                    <div className="col-span-3 space-y-1">
                      {items[idx]?.photo && (
                        <img src={items[idx].photo} alt="Preview" className="w-full h-12 object-contain bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(idx, e)}
                        className="w-full text-[10px] text-gray-500 dark:text-slate-400 overflow-hidden file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-purple-50 dark:file:bg-purple-950/60 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50"
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <input
                        {...register(`items.${idx}.name`, { required: true })}
                        className={inputCls}
                        placeholder="Product name"
                      />
                      <textarea
                        {...register(`items.${idx}.description`)}
                        className={`${inputCls} resize-y min-h-[64px] py-2`}
                        placeholder="Description (optional)"
                        rows={2}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        {...register(`items.${idx}.qty`)}
                        type="number"
                        min="1"
                        className={inputCls + ' text-center'}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        {...register(`items.${idx}.unitPrice`)}
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputCls + ' text-right'}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1 pt-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-slate-200 text-right truncate">
                        ₹{rowTotal.toLocaleString('en-IN')}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-rose-950/40 rounded flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => append({ name: '', description: '', photo: '', qty: 1, unitPrice: 0 })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all border border-dashed border-purple-200 dark:border-purple-800 w-full justify-center"
                >
                  <Plus size={14} /> Add Another Item
                </button>
              </div>
              {/* Total */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                <span className="text-sm text-gray-500 dark:text-slate-400">Total:</span>
                <span className="text-base font-bold text-gray-900 dark:text-slate-100">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300">Notes & Terms</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 cursor-pointer hover:text-gray-700 dark:hover:text-slate-200">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                    defaultChecked={true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValue('notes', storeDefaultTerms);
                      } else {
                        setValue('notes', '');
                      }
                    }}
                  />
                  Use default terms
                </label>
              </div>
              <textarea
                {...register('notes')}
                rows={6}
                className={inputCls + ' resize-none text-[13px] leading-relaxed'}
                placeholder="Terms, conditions, or additional notes…"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-700">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              onClick={() => setSubmitAction('save')}
              disabled={isSubmitting || generating}
              className="px-5 py-2 text-sm font-medium rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-60 transition-colors"
            >
              {generating && submitAction === 'save' ? 'Saving...' : 'Save Only'}
            </button>
            <button
              type="submit"
              onClick={() => setSubmitAction('download')}
              disabled={isSubmitting || generating}
              className="px-5 py-2 text-sm text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-60"
              style={{ background: '#875a7b' }}
            >
              {generating && submitAction === 'download' ? (
                <><span className="spinner w-3 h-3 border-white" /> Generating PDF…</>
              ) : (
                'Save & Download PDF'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuotationModal;

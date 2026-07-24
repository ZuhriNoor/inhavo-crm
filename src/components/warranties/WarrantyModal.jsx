import { useState, useEffect } from 'react';
import { X, Save, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { createWarranty, getWarrantySettings } from '../../services/warrantiesService';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { WarrantyPDF } from '../../utils/warrantyPdfTemplate';

export default function WarrantyModal({ isOpen, onClose, saleOrder, onWarrantyCreated }) {
  const [items, setItems] = useState([]);
  const [termsText, setTermsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedWarranty, setSavedWarranty] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      // Initialize items from sale order with an empty warranty description
      if (saleOrder?.items) {
        setItems(saleOrder.items.map(item => ({ ...item, warrantyDescription: '' })));
      }
    }
  }, [isOpen, saleOrder]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await getWarrantySettings();
      if (settings.termsText) {
        setTermsText(settings.termsText);
      } else if (settings.terms && Array.isArray(settings.terms)) {
        setTermsText(settings.terms.join('\n'));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, value) => {
    const newItems = [...items];
    newItems[index].warrantyDescription = value;
    setItems(newItems);
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const warrantyData = {
        salesOrderId: saleOrder.id,
        salesOrderNumber: saleOrder.salesOrderNumber,
        customerDetails: saleOrder.customerDetails,
        items: items, // Contains name, qty, unitPrice, description, warrantyDescription
        termsText: termsText
      };
      
      const result = await createWarranty(warrantyData);
      setSavedWarranty({ ...warrantyData, ...result });
      if (onWarrantyCreated) onWarrantyCreated();
    } catch (error) {
      console.error('Error creating warranty:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-gray-800 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Generate Warranty Certificate</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">SO: {saleOrder?.salesOrderNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!savedWarranty ? (
            loading ? (
              <div className="py-12 flex items-center justify-center text-gray-500">
                <RefreshCw className="animate-spin mr-2" size={20} /> Loading defaults...
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Items Table */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">Order Items</h3>
                  <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-medium w-1/3">Item Name</th>
                          <th className="px-4 py-3 font-medium w-2/3">Warranty Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 align-top">
                              <p className="font-medium text-gray-900 dark:text-slate-100">{item.name}</p>
                              {item.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{item.description}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.warrantyDescription}
                                onChange={(e) => handleItemChange(idx, e.target.value)}
                                placeholder="e.g. 5 Years Structural, 1 Year Upholstery"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">Warranty Terms</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">This text is pre-filled from your global configuration and will be displayed as a single paragraph. You can edit it for this specific order if needed.</p>
                  <textarea
                    value={termsText}
                    onChange={(e) => setTermsText(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm text-gray-900 dark:text-slate-100 transition-colors resize-y leading-relaxed"
                    placeholder="Enter terms, one per line..."
                  />
                </div>

              </div>
            )
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Warranty Created!</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-6">Certificate #{savedWarranty.warrantyNumber} generated.</p>
              
              <PDFDownloadLink
                document={<WarrantyPDF warranty={savedWarranty} />}
                fileName={`${savedWarranty.warrantyNumber}.pdf`}
                className="px-6 py-2.5 text-white rounded-lg font-medium shadow flex items-center gap-2 hover:opacity-90 transition-colors"
                style={{ background: '#875a7b' }}
              >
                {({ loading }) => loading ? 'Generating PDF...' : <><FileText size={18} /> Download Certificate</>}
              </PDFDownloadLink>
            </div>
          )}
        </div>

        {/* Footer */}
        {!savedWarranty && !loading && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50/50 dark:bg-slate-800/80 rounded-b-2xl">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-colors"
              style={{ background: '#875a7b' }}
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? 'Generating...' : 'Generate Warranty'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

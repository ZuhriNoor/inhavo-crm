import React from 'react';
import { X, Edit2, ExternalLink, FileText } from 'lucide-react';
import { formatDate } from '../../utils/helpers';

const QuotationDetailModal = ({ quotation, onClose, onEdit, onDownload, isDownloading }) => {
  if (!quotation) return null;

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-gray-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
              <FileText size={18} className="text-purple-500 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
                {quotation.quotationNumber || 'Quotation Details'}
              </h2>
              <p className="text-xs text-gray-400 dark:text-slate-400">
                Created: {quotation.createdAt ? formatDate(quotation.createdAt?.toDate?.() || quotation.createdAt) : 'Unknown'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer Details */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-3">Customer Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-700/40 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Name</p>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{quotation.customerDetails?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Email</p>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{quotation.customerDetails?.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Phone</p>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{quotation.customerDetails?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Address</p>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{quotation.customerDetails?.address || '-'}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-3">Products & Services</h3>
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[480px]">
                <thead className="bg-gray-50 dark:bg-slate-700/60 text-gray-500 dark:text-slate-300 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium text-center">Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Rate</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {quotation.items?.map((item, idx) => {
                    const rowTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {item.photo && (
                              <img src={item.photo} alt={item.name} className="w-10 h-10 rounded border border-gray-200 dark:border-slate-600 object-cover" />
                            )}
                            <div>
                              <p className="font-medium text-gray-800 dark:text-slate-100">{item.name}</p>
                              {item.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-300">{item.qty}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-slate-300">₹{(Number(item.unitPrice) || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-slate-100">₹{rowTotal.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-4 px-2">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">₹{(quotation.totalAmount || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-2">Notes & Terms</h3>
              <div className="bg-yellow-50/50 dark:bg-amber-950/30 text-yellow-800 dark:text-amber-300 text-sm rounded-xl p-4 border border-yellow-100 dark:border-amber-900/40 whitespace-pre-wrap">
                {quotation.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50/50 dark:bg-slate-800/80 rounded-b-2xl">
          <button
            onClick={onEdit}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 text-sm text-white font-medium rounded-lg transition-all disabled:opacity-60"
            style={{ background: '#875a7b' }}
          >
            {isDownloading ? (
              <><span className="spinner w-3 h-3 border-white" /> Generating PDF...</>
            ) : (
              <><ExternalLink size={14} /> Download PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuotationDetailModal;

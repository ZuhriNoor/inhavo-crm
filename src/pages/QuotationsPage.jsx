// QuotationsPage — list of all quotations across the active store
import { useState, useEffect, useCallback } from 'react';
import { FileText, ExternalLink, RefreshCw, Edit2 } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { getTasks } from '../services/tasksService';
import { formatDate } from '../utils/helpers';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { pdf } from '@react-pdf/renderer';
import QuotationPDF from '../utils/pdfTemplate';
import QuotationModal from '../components/quotations/QuotationModal';
import QuotationDetailModal from '../components/quotations/QuotationDetailModal';
import { Plus } from 'lucide-react';

const QuotationsPage = () => {
  const { activeStore } = useStore();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [viewingQuote, setViewingQuote] = useState(null);

  const loadData = useCallback(async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'quotations'),
        where('storeId', '==', activeStore.id),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      setQuotations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (q) => {
    setDownloadingId(q.id);
    try {
      const pdfDoc = <QuotationPDF quotation={q} />;
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(q.customerDetails?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_${q.quotationNumber || q.id.slice(-6).toUpperCase()}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!activeStore) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a store to view quotations.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-gray-800">Quotations</h1>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {quotations.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={() => {
              setEditingQuote(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-white font-medium rounded-lg transition-all"
            style={{ background: '#875a7b' }}
          >
            <Plus size={15} />
            New Quotation
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <FileText size={36} className="opacity-30" />
            <p className="text-sm">No quotations yet. Generate one from a lead.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quotations.map((q) => (
              <div
                key={q.id}
                onClick={() => setViewingQuote(q)}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-purple-200 cursor-pointer transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-purple-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {q.customerDetails?.name || 'Unknown customer'} - {q.quotationNumber || q.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {q.createdAt ? formatDate(q.createdAt?.toDate?.() || q.createdAt) : 'Just now'}
                  </p>
                </div>

                <div className="text-sm font-bold text-gray-800">
                  ₹{(q.totalAmount || 0).toLocaleString('en-IN')}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingQuote(q);
                      setShowModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 bg-gray-50 rounded-lg hover:bg-gray-100 hover:text-gray-800 transition-all"
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(q);
                    }}
                    disabled={downloadingId === q.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-all disabled:opacity-50"
                  >
                    {downloadingId === q.id ? (
                      <span className="spinner w-3 h-3 border-purple-600" />
                    ) : (
                      <>
                        <ExternalLink size={13} />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <QuotationModal
          storeId={activeStore.id}
          editingQuotation={editingQuote}
          onClose={() => {
            setShowModal(false);
            setEditingQuote(null);
          }}
          onSaved={loadData}
        />
      )}

      {viewingQuote && (
        <QuotationDetailModal
          quotation={viewingQuote}
          onClose={() => setViewingQuote(null)}
          isDownloading={downloadingId === viewingQuote.id}
          onEdit={() => {
            setViewingQuote(null);
            setEditingQuote(viewingQuote);
            setShowModal(true);
          }}
          onDownload={() => handleDownload(viewingQuote)}
        />
      )}
    </div>
  );
};

export default QuotationsPage;

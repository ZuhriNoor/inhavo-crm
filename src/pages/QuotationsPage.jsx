import { useState, useEffect, useMemo } from 'react';
import { FileText, ExternalLink, RefreshCw, Edit2, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/helpers';
import { pdf } from '@react-pdf/renderer';
import QuotationPDF from '../utils/pdfTemplate';
import QuotationModal from '../components/quotations/QuotationModal';
import QuotationDetailModal from '../components/quotations/QuotationDetailModal';
import ListControlsBar from '../components/shared/ListControlsBar';
import { applyListControls } from '../utils/listControls';

const ALL_RECORDS_SIZE = 5000;
const PAGE_SIZE = 15;

const QuotationsPage = () => {
  const { activeStore } = useStore();
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [controls, setControls] = useState({ filters: [], sortBy: '', sortDir: 'desc', groupBy: '' });
  const [page, setPage] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [viewingQuote, setViewingQuote] = useState(null);

  useEffect(() => {
    fetchQuotations();
  }, [activeStore]);

  const fetchQuotations = async () => {
    if (!activeStore) return;
    setLoading(true);

    try {
      const { getQuotations } = await import('../services/quotationsService');
      const response = await getQuotations(activeStore.id, null, ALL_RECORDS_SIZE, profile);
      setQuotations(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(0);
    fetchQuotations();
  };

  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (q) => {
    setDownloadingId(q.id);
    try {
      const pdfDoc = <QuotationPDF quotation={q} />;
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const qNum = q.quotationNumber || q.id.slice(-6).toUpperCase();
      const safeQNum = qNum.replace(/\//g, '-');
      link.download = `${(q.customerDetails?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_${safeQNum}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const fields = useMemo(() => [
    { key: 'customerDetails.name', label: 'Customer', type: 'text' },
    { key: 'quotationNumber', label: 'Quotation No.', type: 'text' },
    { key: 'totalAmount', label: 'Amount', type: 'number' },
    { key: 'createdAt', label: 'Date', type: 'date', getValue: (q) => q.createdAt?.toDate?.() || q.createdAt },
    {
      key: 'status', label: 'Status', type: 'select',
      options: [{ value: 'Draft', label: 'Draft' }, { value: 'Sent', label: 'Sent' }, { value: 'Converted', label: 'Converted' }],
    },
  ], []);

  const baseFiltered = quotations.filter((q) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const matchName = q.customerDetails?.name?.toLowerCase().includes(s);
    const matchNumber = q.quotationNumber?.toLowerCase().includes(s);
    return matchName || matchNumber;
  });

  const { flat, groups } = useMemo(
    () => applyListControls(baseFiltered, controls, fields),
    [baseFiltered, controls, fields]
  );

  useEffect(() => { setPage(0); }, [controls, search]);

  const totalPages = Math.max(1, Math.ceil(flat.length / PAGE_SIZE));
  const pagedFlat = flat.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const filteredQuotations = groups ? flat : pagedFlat;

  const renderQuotationRows = (list) => (
    <div className="space-y-2">
      {list.map((q) => (
        <div
          key={q.id}
          onClick={() => setViewingQuote(q)}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-sm hover:border-purple-200 dark:hover:border-purple-500 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-4 w-full sm:w-auto flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-purple-500 dark:text-purple-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                {q.customerDetails?.name || 'Unknown customer'} - {q.quotationNumber || q.id.slice(-6).toUpperCase()}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                {q.createdAt ? formatDate(q.createdAt?.toDate?.() || q.createdAt) : 'Just now'}
              </p>
            </div>

            <div className="text-sm font-bold text-gray-800 dark:text-slate-100 whitespace-nowrap px-2">
              ₹{(q.totalAmount || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-slate-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingQuote(q);
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-200 border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-all"
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all disabled:opacity-50"
            >
              {downloadingId === q.id ? (
                <span className="spinner w-3 h-3 border-purple-600 dark:border-purple-400" />
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
  );

  if (!activeStore) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a store to view quotations.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 sm:px-6 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shrink-0 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 truncate">Quotations</h1>
            <span className="text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full shrink-0">
              {flat.length} total
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {profile?.role === 'admin' && (
              <button
                onClick={() => {
                  setEditingQuote(null);
                  setShowModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm text-white font-medium rounded-lg transition-all"
                style={{ background: '#875a7b' }}
              >
                <Plus size={14} />
                New Quotation
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search quotations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-white dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <ListControlsBar fields={fields} value={controls} onChange={setControls} />
          </div>

          {/* Pagination Controls */}
          {!groups && (
            <div className="flex items-center gap-1.5 lg:ml-auto">
              <span className="text-xs text-gray-500 dark:text-slate-400 mx-1">Page {page + 1}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-slate-500 gap-2">
            <FileText size={36} className="opacity-30" />
            <p className="text-sm">{search ? 'No quotations match your search.' : 'No quotations yet. Generate one from a lead.'}</p>
          </div>
        ) : groups ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-2.5">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">{group.label}</h3>
                  <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 px-2 py-0.5 rounded-full">
                    {group.items.length}
                  </span>
                </div>
                {renderQuotationRows(group.items)}
              </div>
            ))}
          </div>
        ) : (
          renderQuotationRows(filteredQuotations)
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
          onSaved={handleRefresh}
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

import { useState, useEffect, useMemo } from 'react';
import { Truck, Search, FileText, RefreshCw, Calendar, Building2, Trash2 } from 'lucide-react';
import { getAllPurchaseOrders, updatePurchaseOrderStatus, deletePurchaseOrder } from '../services/purchaseOrdersService';
import { useStore } from '../contexts/StoreContext';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Navigate } from 'react-router-dom';
import { PurchaseOrderPDF } from '../utils/purchaseOrderPdfTemplate';
import PurchaseOrderEditModal from '../components/purchaseOrders/PurchaseOrderEditModal';
import { formatDate } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';
import ListControlsBar from '../components/shared/ListControlsBar';
import { applyListControls } from '../utils/listControls';

const STATUS_COLORS = {
  Issued: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'In Production': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPo, setSelectedPo] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { activeStore } = useStore();
  const { isAdmin, profile } = useAuth();
  const [controls, setControls] = useState({ filters: [], sortBy: '', sortDir: 'desc', groupBy: '' });

  useEffect(() => {
    fetchOrders();
  }, [activeStore]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getAllPurchaseOrders(activeStore?.id, profile);
      setPurchaseOrders(data);
    } catch (err) {
      console.error('Error loading purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (poId, newStatus) => {
    try {
      await updatePurchaseOrderStatus(poId, newStatus);
      setPurchaseOrders(prev =>
        prev.map(po => (po.id === poId ? { ...po, status: newStatus } : po))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    }
  };

  const handleDeletePo = async (poId, poNumber) => {
    if (!window.confirm(`Are you sure you want to delete Purchase Order ${poNumber}? This will release its items to be ordered again.`)) return;
    try {
      await deletePurchaseOrder(poId);
      setPurchaseOrders(prev => prev.filter(po => po.id !== poId));
    } catch (err) {
      console.error('Failed to delete PO:', err);
      alert('Failed to delete Purchase Order');
    }
  };

  const baseFiltered = purchaseOrders.filter(po => {
    const query = searchQuery.toLowerCase();
    return (
      po.poNumber?.toLowerCase().includes(query) ||
      po.salesOrderNumber?.toLowerCase().includes(query) ||
      po.vendor?.name?.toLowerCase().includes(query)
    );
  });

  const fields = useMemo(() => [
    { key: 'poNumber', label: 'PO Number', type: 'text' },
    { key: 'salesOrderNumber', label: 'Sales Order', type: 'text' },
    { key: 'vendor.name', label: 'Vendor', type: 'text' },
    {
      key: 'status', label: 'Status', type: 'select',
      options: Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s })),
    },
    { key: 'deliveryDate', label: 'Target Delivery', type: 'date' },
    { key: 'createdAt', label: 'Created', type: 'date' },
  ], []);

  const { flat, groups } = useMemo(
    () => applyListControls(baseFiltered, controls, fields),
    [baseFiltered, controls, fields]
  );
  const filteredOrders = flat;

  const renderPoRows = (list) => (
    <div className="space-y-4">
      {list.map(po => {
        const dateStr = formatDate(po.createdAt);

        return (
          <div
            key={po.id}
            onClick={() => { setSelectedPo(po); setEditModalOpen(true); }}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer group"
          >
            {/* Info Left */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-gray-900 dark:text-slate-100 text-base">
                  {po.poNumber}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                  SO: {po.salesOrderNumber}
                </span>
                {po.deliveryDate && (
                  <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                    <Calendar size={12} /> Target: {formatDate(po.deliveryDate)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-slate-400 flex-wrap">
                <span className="flex items-center gap-1 font-medium text-gray-800 dark:text-slate-200">
                  <Building2 size={13} className="text-gray-400" /> Vendor: {po.vendor?.name || 'N/A'}
                </span>
                <span>Created: {dateStr}</span>
                <span>Items: <strong className="text-gray-800 dark:text-slate-200">{po.items?.length || 0} items</strong></span>
              </div>

              {/* Items summary */}
              {po.items && po.items.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">
                  {po.items.map(it => `${it.name} (x${it.qty})`).join(', ')}
                </p>
              )}
            </div>

            {/* Status & PDF Right */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto" onClick={e => e.stopPropagation()}>
              <select
                value={po.status || 'Issued'}
                onChange={e => handleStatusChange(po.id, e.target.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold focus:outline-none ${STATUS_COLORS[po.status] || STATUS_COLORS.Issued}`}
              >
                <option value="Issued">Issued</option>
                <option value="In Production">In Production</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <PDFDownloadLink
                document={<PurchaseOrderPDF po={po} />}
                fileName={`${po.poNumber}.pdf`}
                className="px-3.5 py-1.5 text-white text-xs font-medium rounded-lg shadow-sm flex items-center gap-1.5 transition-colors hover:opacity-90"
                style={{ background: '#875a7b' }}
              >
                {({ loading: pdfLoading }) =>
                  pdfLoading ? (
                    'Generating...'
                  ) : (
                    <>
                      <FileText size={14} /> Download PDF
                    </>
                  )
                }
              </PDFDownloadLink>

              <button
                type="button"
                onClick={() => handleDeletePo(po.id, po.poNumber)}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Delete Purchase Order"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!isAdmin && profile?.canViewPurchaseOrders !== true && profile?.canViewPurchaseOrders !== 'true') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Truck className="text-purple-600 dark:text-purple-400" size={24} /> Purchase Orders
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Track vendor orders, production statuses, and download purchase order PDFs.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search PO Number, Vendor, or Sales Order..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <ListControlsBar fields={fields} value={controls} onChange={setControls} />
      </div>

      {/* Purchase Orders List */}
      {loading ? (
        <div className="py-16 flex justify-center items-center text-gray-500">
          <RefreshCw className="animate-spin mr-2" size={20} /> Loading Purchase Orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-12 text-center">
          <Truck className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-gray-900 dark:text-slate-100 font-medium">No Purchase Orders Found</h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Purchase Orders created from Sales Orders will appear here.
          </p>
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
              {renderPoRows(group.items)}
            </div>
          ))}
        </div>
      ) : (
        renderPoRows(filteredOrders)
      )}

      {editModalOpen && selectedPo && (
        <PurchaseOrderEditModal
          isOpen={editModalOpen}
          onClose={() => { setEditModalOpen(false); setSelectedPo(null); }}
          po={selectedPo}
          onSaved={fetchOrders}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { getSalesOrders } from '../services/salesOrdersService';
import { formatDate } from '../utils/helpers';
import EmptyState from '../components/shared/EmptyState';
import LoadingScreen from '../components/shared/LoadingScreen';
import ListControlsBar from '../components/shared/ListControlsBar';
import { applyListControls } from '../utils/listControls';

const STATUS_OPTIONS = ['Confirmed', 'Sent to Factory', 'Woodworking', 'Polishing', 'Ready for Delivery', 'Completed', 'Cancelled'];
const ALL_RECORDS_SIZE = 5000;
const PAGE_SIZE = 15;

export default function SalesOrdersPage() {
  const { activeStore } = useStore();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [controls, setControls] = useState({ filters: [], sortBy: '', sortDir: 'desc', groupBy: '' });
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, [activeStore]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await getSalesOrders(activeStore?.id, null, ALL_RECORDS_SIZE, profile);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fields = useMemo(() => [
    { key: 'salesOrderNumber', label: 'Order No.', type: 'text' },
    { key: 'customerDetails.name', label: 'Customer', type: 'text' },
    {
      key: 'status', label: 'Status', type: 'select',
      options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
    },
    { key: 'totalAmount', label: 'Amount', type: 'number' },
    { key: 'createdAt', label: 'Date', type: 'date', getValue: (o) => o.createdAt?.toDate?.() || o.createdAt },
  ], []);

  const baseFiltered = orders.filter(
    (order) =>
      order.salesOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { flat, groups } = useMemo(
    () => applyListControls(baseFiltered, controls, fields),
    [baseFiltered, controls, fields]
  );

  useEffect(() => { setPage(0); }, [controls, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(flat.length / PAGE_SIZE));
  const pagedFlat = flat.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const filteredOrders = groups ? flat : pagedFlat;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      case 'Sent to Factory': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400';
      case 'Woodworking': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
      case 'Polishing': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
      case 'Ready for Delivery': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
      case 'Completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
      case 'Cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const renderOrderRows = (list) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 dark:bg-slate-700/60 text-gray-500 dark:text-slate-300">
            <tr>
              <th className="px-6 py-3.5 font-medium">Order No.</th>
              <th className="px-6 py-3.5 font-medium">Date</th>
              <th className="px-6 py-3.5 font-medium">Customer</th>
              <th className="px-6 py-3.5 font-medium">Status</th>
              <th className="px-6 py-3.5 font-medium text-right">Amount</th>
              <th className="px-6 py-3.5 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
            {list.map((order) => (
              <tr
                key={order.id}
                onClick={() => navigate(`/sales-orders/${order.id}`)}
                className="hover:bg-gray-50/80 dark:hover:bg-slate-700/40 transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4 font-medium text-purple-700 dark:text-purple-400 group-hover:text-purple-800 dark:group-hover:text-purple-300">
                  {order.salesOrderNumber}
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                  {formatDate(order.createdAt?.toDate?.() || order.createdAt)}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 dark:text-slate-100">{order.customerDetails?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{order.customerDetails?.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status || 'Confirmed'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-slate-100">
                  ₹{(order.totalAmount || 0).toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/sales-orders/${order.id}`); }}
                    className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    title="View Details"
                  >
                    <Eye size={18} className="mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50/50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
            <Package className="text-purple-500 dark:text-purple-400" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Sales Orders</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Manage orders, dockets, and warranties</p>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 transition-colors space-y-3">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by order number or customer..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Pagination Controls */}
          {!groups && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-slate-400 mr-2">Page {page + 1}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <ListControlsBar fields={fields} value={controls} onChange={setControls} />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <LoadingScreen />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No sales orders found"
            message={searchTerm ? 'Try a different search term.' : 'Convert a quotation to create a sales order.'}
          />
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
                {renderOrderRows(group.items)}
              </div>
            ))}
          </div>
        ) : (
          renderOrderRows(filteredOrders)
        )}
      </div>
    </div>
  );
}

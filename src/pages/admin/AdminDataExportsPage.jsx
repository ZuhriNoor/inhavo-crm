import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Store, Truck, Users, Package, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getStages } from '../../services/stagesService';
import { getUsers } from '../../services/usersService';
import {
  exportQuotationsToExcel,
  exportSalesOrdersToExcel,
  exportPurchaseOrdersToExcel,
  exportDocketsToExcel,
  exportLeadsToExcel,
} from '../../utils/exportUtils';
import { runVisibleToMigration } from '../../utils/migration';
import LoadingScreen from '../../components/shared/LoadingScreen';

export default function AdminDataExportsPage() {
  const { availableStores } = useStore();
  const [selectedStoreId, setSelectedStoreId] = useState('all');
  
  const [loading, setLoading] = useState(false);
  const [exportingModule, setExportingModule] = useState(null);
  const [counts, setCounts] = useState({
    quotations: 0,
    salesOrders: 0,
    purchaseOrders: 0,
    dockets: 0,
    leads: 0,
  });
  
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');

  useEffect(() => {
    fetchCounts();
  }, [selectedStoreId]);

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const getStoreQuery = (colName) => {
        if (selectedStoreId !== 'all') {
          return query(collection(db, colName), where('storeId', '==', selectedStoreId));
        }
        return query(collection(db, colName));
      };

      const [qSnap, soSnap, poSnap, docSnap, leadSnap] = await Promise.all([
        getDocs(getStoreQuery('quotations')),
        getDocs(getStoreQuery('salesOrders')),
        getDocs(getStoreQuery('purchaseOrders')),
        getDocs(getStoreQuery('dockets')),
        getDocs(getStoreQuery('leads')),
      ]);

      setCounts({
        quotations: qSnap.size,
        salesOrders: soSnap.size,
        purchaseOrders: poSnap.size,
        dockets: docSnap.size,
        leads: leadSnap.size,
      });
    } catch (err) {
      console.error('Error fetching export counts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (moduleType) => {
    setExportingModule(moduleType);
    try {
      const getStoreQuery = (colName) => {
        if (selectedStoreId !== 'all') {
          return query(collection(db, colName), where('storeId', '==', selectedStoreId));
        }
        return query(collection(db, colName));
      };

      const selectedStoreObj = availableStores.find(s => s.id === selectedStoreId);
      const storeName = selectedStoreObj ? selectedStoreObj.name : 'All Stores';
      const storesMap = (availableStores || []).reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {});

      if (moduleType === 'quotations') {
        const snap = await getDocs(getStoreQuery('quotations'));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        exportQuotationsToExcel(docs, storesMap, storeName);
      } else if (moduleType === 'salesOrders') {
        const snap = await getDocs(getStoreQuery('salesOrders'));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        exportSalesOrdersToExcel(docs, storesMap, storeName);
      } else if (moduleType === 'purchaseOrders') {
        const snap = await getDocs(getStoreQuery('purchaseOrders'));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        exportPurchaseOrdersToExcel(docs, storesMap, storeName);
      } else if (moduleType === 'dockets') {
        const snap = await getDocs(getStoreQuery('dockets'));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        exportDocketsToExcel(docs, storesMap, storeName);
      } else if (moduleType === 'leads') {
        const [snap, stages, users] = await Promise.all([
          getDocs(getStoreQuery('leads')),
          getStages(),
          getUsers(),
        ]);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        exportLeadsToExcel(docs, stages, users, storesMap, storeName);
      }
    } catch (err) {
      console.error(`Failed to export ${moduleType}:`, err);
      alert(`Failed to export ${moduleType} data.`);
    } finally {
      setExportingModule(null);
    }
  };

  const handleMigration = async () => {
    if (!confirm('Are you sure you want to run the visibleTo array backfill migration? This should only be run once.')) return;
    setMigrating(true);
    setMigrationStatus('Starting migration...');
    try {
      await runVisibleToMigration(setMigrationStatus);
    } catch (err) {
      console.error(err);
      setMigrationStatus('Migration failed!');
    } finally {
      setTimeout(() => setMigrating(false), 3000);
    }
  };

  const EXPORT_CARDS = [
    {
      id: 'quotations',
      title: 'Quotations',
      description: 'Export all customer quotation records, totals, and extra costs.',
      icon: FileText,
      count: counts.quotations,
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-700 dark:text-purple-300',
      borderColor: 'border-purple-200 dark:border-purple-800/60',
    },
    {
      id: 'salesOrders',
      title: 'Sales Orders',
      description: 'Export sales order numbers, delivery dates, totals, advances, and item lists.',
      icon: Store,
      count: counts.salesOrders,
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-800/60',
    },
    {
      id: 'purchaseOrders',
      title: 'Purchase Orders',
      description: 'Export vendor purchase orders, status, subtotals, GST, and item breakdowns.',
      icon: Truck,
      count: counts.purchaseOrders,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-700 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-800/60',
    },
    {
      id: 'dockets',
      title: 'Dockets & Production',
      description: 'Export job dockets, specifications, template choices, and production statuses.',
      icon: Package,
      count: counts.dockets,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    },
    {
      id: 'leads',
      title: 'Leads & Inquiries',
      description: 'Export CRM leads, customer contacts, assigned sales representatives, and values.',
      icon: Users,
      count: counts.leads,
      color: 'from-rose-500 to-pink-600',
      bgColor: 'bg-rose-50 dark:bg-rose-900/20',
      textColor: 'text-rose-700 dark:text-rose-300',
      borderColor: 'border-rose-200 dark:border-rose-800/60',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card & Store Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Download className="text-purple-600 dark:text-purple-400" size={24} />
            <span>Admin Data Export Center</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Download complete system reports into Excel-compatible CSV files.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 whitespace-nowrap">
            Filter Store:
          </label>
          <select
            value={selectedStoreId}
            onChange={e => setSelectedStoreId(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-medium text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="all">All Stores (Global Export)</option>
            {availableStores.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={fetchCounts}
            disabled={loading}
            className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-200 rounded-lg transition-colors"
            title="Refresh counts"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Migration Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Database Maintenance</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Run data migrations for system updates. {migrationStatus && <span className="text-purple-600 font-semibold">{migrationStatus}</span>}
          </p>
        </div>
        <button
          onClick={handleMigration}
          disabled={migrating}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {migrating ? 'Migrating...' : 'Run visibleTo Migration'}
        </button>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EXPORT_CARDS.map(card => {
          const Icon = card.icon;
          const isExporting = exportingModule === card.id;

          return (
            <div
              key={card.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.bgColor} ${card.textColor}`}>
                    <Icon size={24} />
                  </div>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full text-xs font-bold">
                    {loading ? '...' : `${card.count} records`}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-6">
                  {card.description}
                </p>
              </div>

              <button
                onClick={() => handleExport(card.id)}
                disabled={card.count === 0 || isExporting || loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Preparing Excel...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={16} />
                    <span>Export {card.title} to Excel</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

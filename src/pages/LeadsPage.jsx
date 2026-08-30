// LeadsPage — standalone leads list with search, filter, sort and group
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Search, Archive, Users, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { getLeads } from '../services/leadsService';
import { getStages } from '../services/stagesService';
import { formatDate } from '../utils/helpers';
import LeadModal from '../components/leads/LeadModal';
import ListControlsBar from '../components/shared/ListControlsBar';
import { applyListControls } from '../utils/listControls';

const ALL_RECORDS_SIZE = 5000;
const PAGE_SIZE = 15;

const LeadsPage = () => {
  const { activeStore } = useStore();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [controls, setControls] = useState({ filters: [], sortBy: '', sortDir: 'asc', groupBy: '' });
  const [page, setPage] = useState(0);

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [activeStore]);

  const fetchLeads = async () => {
    if (!activeStore) return;
    setLoading(true);

    try {
      const [leadsResponse, stagesData] = await Promise.all([
        getLeads([activeStore.id], true, null, ALL_RECORDS_SIZE, profile),
        getStages([activeStore.id]),
      ]);

      setLeads(leadsResponse.data);
      setStages(stagesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(0);
    fetchLeads();
  };

  const getStageName = (stageId) => {
    return stages.find((s) => s.id === stageId)?.name || 'Unknown';
  };

  const renderStars = (priority) => {
    if (!priority) return null;
    return (
      <span className="flex items-center gap-0.5 shrink-0">
        {[1, 2, 3].map((star) => (
          <Star
            key={star}
            size={11}
            className={star <= priority ? 'text-yellow-400' : 'text-gray-200 dark:text-slate-600'}
            fill={star <= priority ? 'currentColor' : 'none'}
          />
        ))}
      </span>
    );
  };

  const fields = useMemo(() => [
    { key: 'customerName', label: 'Customer', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'leadNumber', label: 'Lead ID', type: 'text' },
    {
      key: 'stageId', label: 'Stage', type: 'select',
      options: stages.map((s) => ({ value: s.id, label: s.name })),
    },
    { key: 'expectedRevenue', label: 'Expected Revenue', type: 'number' },
    { key: 'createdAt', label: 'Created Date', type: 'date', getValue: (l) => l.createdAt },
    {
      key: 'priority', label: 'Priority', type: 'select',
      options: [
        { value: '0', label: 'Low' },
        { value: '1', label: '★ Medium' },
        { value: '2', label: '★★ High' },
        { value: '3', label: '★★★ Urgent' },
      ],
      getValue: (l) => String(l.priority || 0),
    },
    {
      key: 'deleted', label: 'Status', type: 'select',
      options: [{ value: 'false', label: 'Active' }, { value: 'true', label: 'Deleted' }],
      getValue: (l) => String(!!l.deleted),
    },
  ], [stages]);

  const baseFiltered = leads.filter((l) => {
    if (!showDeleted && l.deleted) return false;
    if (showDeleted && !l.deleted) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = l.customerName?.toLowerCase().includes(q);
      const matchPhone = l.phone?.toLowerCase().includes(q);
      const matchId = l.leadNumber?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchId) return false;
    }
    return true;
  });

  const { flat, groups } = useMemo(
    () => applyListControls(baseFiltered, controls, fields),
    [baseFiltered, controls, fields]
  );

  useEffect(() => { setPage(0); }, [controls, search, showDeleted]);

  const totalPages = Math.max(1, Math.ceil(flat.length / PAGE_SIZE));
  const pagedFlat = flat.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const filteredLeads = groups ? flat : pagedFlat;

  const renderLeadRows = (list) => (
    <>
      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden space-y-2.5">
        {list.map((lead) => (
          <div
            key={lead.id}
            onClick={() => navigate(`/leads/${lead.id}`)}
            className={`p-3.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-500 transition-all ${
              lead.deleted ? 'opacity-60 bg-red-50/30 dark:bg-rose-950/20' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                {lead.leadNumber || lead.id.slice(-6).toUpperCase()}
                {renderStars(lead.priority)}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                {getStageName(lead.stageId)}
              </span>
            </div>

            <div className="font-semibold text-sm text-gray-800 dark:text-slate-100">
              {lead.customerName || 'Unknown'}
            </div>

            <div className="flex items-center justify-between gap-2 mt-2 text-xs text-gray-500 dark:text-slate-400">
              <span>{lead.phone || lead.email || 'No contact'}</span>
              <span className="font-semibold text-gray-700 dark:text-slate-200">
                {lead.expectedRevenue ? `₹${Number(lead.expectedRevenue).toLocaleString('en-IN')}` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-[11px]">
              <span className="text-gray-400 dark:text-slate-500">{formatDate(lead.createdAt)}</span>
              {lead.deleted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-rose-400">
                  <Archive size={11} /> Deleted
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-medium text-green-600 dark:text-emerald-400">
                  Active
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-x-auto transition-colors">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 dark:bg-slate-700/60 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-300">
            <tr>
              <th className="px-6 py-3 font-medium">Lead ID</th>
              <th className="px-6 py-3 font-medium">Customer</th>
              <th className="px-6 py-3 font-medium">Stage</th>
              <th className="px-6 py-3 font-medium">Expected Rev.</th>
              <th className="px-6 py-3 font-medium">Created Date</th>
              <th className="px-6 py-3 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
            {list.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => navigate(`/leads/${lead.id}`)}
                className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors ${lead.deleted ? 'opacity-60 bg-red-50/30 dark:bg-rose-950/20' : ''}`}
              >
                <td className="px-6 py-4 font-medium text-purple-700 dark:text-purple-400">
                  <span className="flex items-center gap-1.5">
                    {lead.leadNumber || lead.id.slice(-6).toUpperCase()}
                    {renderStars(lead.priority)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-800 dark:text-slate-100">{lead.customerName || 'Unknown'}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-400">{lead.phone || lead.email || 'No contact'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                    {getStageName(lead.stageId)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-slate-300 font-medium">
                  {lead.expectedRevenue ? `₹${Number(lead.expectedRevenue).toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-xs">
                  {formatDate(lead.createdAt)}
                </td>
                <td className="px-6 py-4 text-right">
                  {lead.deleted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/40 px-2 py-1 rounded-full border border-red-100 dark:border-rose-900/60">
                      <Archive size={12} /> Deleted
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium text-green-600 dark:text-emerald-400 bg-green-50 dark:bg-emerald-950/40 px-2 py-1 rounded-full border border-green-100 dark:border-emerald-900/60">
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  if (!activeStore) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a store to view leads.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 sm:px-6 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shrink-0 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-slate-100 truncate">All Leads</h1>
            <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 px-2 py-0.5 rounded-full shrink-0">
              {flat.length}
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
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-white font-medium rounded-lg"
              style={{ background: '#875a7b' }}
            >
              <Plus size={14} />
              <span>New Lead</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-56">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-white dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 bg-gray-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors shrink-0">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
              />
              Show Deleted
            </label>

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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-slate-500 gap-3">
            <Users size={40} className="opacity-20" />
            <p className="text-sm">No leads found matching your criteria.</p>
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
                {renderLeadRows(group.items)}
              </div>
            ))}
          </div>
        ) : (
          renderLeadRows(filteredLeads)
        )}
      </div>

      {showModal && (
        <LeadModal
          stages={stages}
          storeId={activeStore.id}
          onClose={() => setShowModal(false)}
          onSaved={handleRefresh}
        />
      )}
    </div>
  );
};

export default LeadsPage;

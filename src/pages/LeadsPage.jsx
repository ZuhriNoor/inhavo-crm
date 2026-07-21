// LeadsPage — standalone leads list with search and soft-delete toggle
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Search, Archive, Users } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { getLeads } from '../services/leadsService';
import { getStages } from '../services/stagesService';
import { formatDate } from '../utils/helpers';
import LeadModal from '../components/leads/LeadModal';

const LeadsPage = () => {
  const { activeStore } = useStore();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const [leadsData, stagesData] = await Promise.all([
        getLeads([activeStore.id], true), // Always fetch all, including deleted, to filter locally
        getStages([activeStore.id]),
      ]);
      setLeads(leadsData);
      setStages(stagesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter leads based on deleted toggle and search query
  const filteredLeads = leads.filter((l) => {
    // 1. Deleted filter
    if (!showDeleted && l.deleted) return false;
    if (showDeleted && !l.deleted) return false; // Or just show both? The prompt says "see deleted items". Usually means show deleted ONLY or show BOTH. Let's make it show BOTH if checked.
    // Wait, let's just make it show deleted items alongside active ones.
    if (!showDeleted && l.deleted) return false;

    // 2. Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = l.customerName?.toLowerCase().includes(q);
      const matchPhone = l.phone?.toLowerCase().includes(q);
      const matchId = l.leadNumber?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchId) return false;
    }
    return true;
  });

  const getStageName = (stageId) => {
    return stages.find((s) => s.id === stageId)?.name || 'Unknown';
  };

  if (!activeStore) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a store to view leads.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-800">All Leads</h1>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {filteredLeads.length}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 w-64"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900 bg-gray-50 px-3 py-1.5 rounded border border-gray-200 transition-colors">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            Show Deleted
          </label>

          <div className="h-5 w-px bg-gray-200 mx-1"></div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm text-white font-medium rounded-lg"
            style={{ background: '#875a7b' }}
          >
            <Plus size={15} /> New Lead
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <Users size={40} className="opacity-20" />
            <p className="text-sm">No leads found matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Lead ID</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Stage</th>
                  <th className="px-6 py-3 font-medium">Expected Rev.</th>
                  <th className="px-6 py-3 font-medium">Created Date</th>
                  <th className="px-6 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${lead.deleted ? 'opacity-60 bg-red-50/30' : ''}`}
                  >
                    <td className="px-6 py-4 font-medium text-purple-700">
                      {lead.leadNumber || lead.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{lead.customerName || 'Unknown'}</div>
                      <div className="text-xs text-gray-400">{lead.phone || lead.email || 'No contact'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        {getStageName(lead.stageId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {lead.expectedRevenue ? `₹${Number(lead.expectedRevenue).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {lead.deleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                          <Archive size={12} /> Deleted
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <LeadModal
          stages={stages}
          storeId={activeStore.id}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default LeadsPage;

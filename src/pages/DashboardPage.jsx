// DashboardPage — main Kanban CRM view
import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Filter, Download } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { getStages } from '../services/stagesService';
import { getLeads } from '../services/leadsService';
import { getUsers } from '../services/usersService';
import KanbanBoard from '../components/kanban/KanbanBoard';
import LeadModal from '../components/leads/LeadModal';

const DashboardPage = () => {
  const { activeStore } = useStore();
  const { isAdmin, profile } = useAuth();

  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lead modal
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState('');

  const loadData = useCallback(async (showLoading = true) => {
    if (!activeStore) return;
    if (showLoading) setLoading(true);
    if (showLoading) setError('');
    try {
      const [stagesData, leadsData, usersData] = await Promise.all([
        getStages(),
        getLeads([activeStore.id]),
        getUsers(),
      ]);
      setStages(stagesData);
      setLeads(leadsData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
      if (showLoading) setError('Failed to load data. Please refresh.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddLead = (stageId) => {
    setDefaultStageId(stageId);
    setShowLeadModal(true);
  };

  const handleExport = () => {
    const headers = [
      'Opportunity Title', 'Customer Name', 'Company', 'Phone', 'Email', 
      'Location', 'Source', 'Expected Revenue', 'Priority', 'Stage', 'Created At'
    ];
    
    const rows = leads.map(l => {
      const stageName = stages.find(s => s.id === l.stageId)?.name || '';
      const date = l.createdAt?.toDate?.() ? l.createdAt.toDate() : (l.createdAt ? new Date(l.createdAt) : null);
      const formattedDate = date ? date.toLocaleDateString() : '';
      return [
        `"${(l.opportunityTitle || '').replace(/"/g, '""')}"`,
        `"${(l.customerName || '').replace(/"/g, '""')}"`,
        `"${(l.company || '').replace(/"/g, '""')}"`,
        `"${(l.phone || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.address || '').replace(/"/g, '""')}"`,
        `"${(l.source || '').replace(/"/g, '""')}"`,
        l.expectedRevenue || 0,
        l.priority || 0,
        `"${stageName}"`,
        `"${formattedDate}"`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${activeStore.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  if (!activeStore) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <Filter size={28} className="text-gray-300" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-700 mb-1">No store selected</p>
          <p className="text-sm text-gray-400">
            {isAdmin
              ? 'Create a store in the Admin panel to get started.'
              : 'You have not been assigned to any store yet.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Board header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-gray-800">
            {activeStore.name}
          </h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={loading || leads.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
            title="Export to CSV"
          >
            <Download size={15} />
            Export
          </button>

          {/* New Lead */}
          <button
            onClick={() => handleAddLead(stages[0]?.id || '')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-white font-medium rounded-lg transition-all"
            style={{ background: '#875a7b' }}
          >
            <Plus size={15} />
            New Lead
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-600 shrink-0">
          {error}
        </div>
      )}

      {/* Board loading skeleton */}
      {loading ? (
        <div className="flex gap-5 px-6 py-4 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shrink-0" style={{ width: 280 }}>
              <div className="skeleton h-5 w-24 rounded mb-3" />
              {[1, 2].map((j) => (
                <div key={j} className="skeleton h-24 rounded-lg mb-2" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* Kanban Board */
        <div className="flex-1 overflow-hidden">
          {stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <p className="font-medium">No pipeline stages yet.</p>
              {isAdmin && (
                <p className="text-sm">
                  Go to <strong>Admin → Pipeline</strong> to create stages.
                </p>
              )}
            </div>
          ) : (
            <KanbanBoard
              stages={stages}
              leads={leads}
              users={users}
              onAddLead={handleAddLead}
              onLeadsChange={loadData}
            />
          )}
        </div>
      )}

      {/* Lead Create Modal */}
      {showLeadModal && (
        <LeadModal
          stages={stages}
          users={users}
          storeId={activeStore.id}
          defaultStageId={defaultStageId}
          onClose={() => setShowLeadModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
};

export default DashboardPage;

// LeadDetailPage — full lead detail view with tasks and quotations
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, Phone, Mail, MapPin, Building2,
  Calendar, User, StickyNote, Plus, CheckSquare, FileText, Tag,
  Globe, IndianRupee, Target, Star, Briefcase, RefreshCcw, Archive,
  ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { getLead, getLeads, deleteLead, restoreLead } from '../services/leadsService';
import { getTasksByLead } from '../services/tasksService';
import { getQuotationsByLead } from '../services/quotationsService';
import { getStages } from '../services/stagesService';
import { getUsers } from '../services/usersService';
import { formatDate, isOverdue } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import LeadModal from '../components/leads/LeadModal';
import TaskModal from '../components/tasks/TaskModal';
import PhoneLink from '../components/shared/PhoneLink';
import QuotationModal from '../components/quotations/QuotationModal';
import QuotationDetailModal from '../components/quotations/QuotationDetailModal';
import { pdf } from '@react-pdf/renderer';
import QuotationPDF from '../utils/pdfTemplate';
import useSwipeGesture from '../hooks/useSwipeGesture';

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={15} className="text-gray-400 dark:text-slate-500 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800 dark:text-slate-100 font-medium break-words">{value}</p>
      </div>
    </div>
  );
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 dark:bg-amber-950/60 text-yellow-700 dark:text-amber-300',
  'in-progress': 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
  completed: 'bg-green-100 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-300',
};

const LeadDetailPage = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, profile } = useAuth();
  const { activeStore } = useStore();

  const [lead, setLead] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'quotations'

  // Lead navigation sequence
  const [leadIds, setLeadIds] = useState(() => {
    if (location.state?.leadIds && Array.isArray(location.state.leadIds)) {
      return location.state.leadIds;
    }
    try {
      const cached = sessionStorage.getItem('crm_active_lead_ids');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.includes(leadId)) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [viewingQuotation, setViewingQuotation] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [showMobileDetails, setShowMobileDetails] = useState(false);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const leadData = await getLead(leadId);
      if (!leadData) {
        setLead(null);
        setLoading(false);
        return;
      }

      const [tasksData, quotsData, stagesData, usersData] = await Promise.all([
        getTasksByLead(leadId, leadData.storeId, profile),
        getQuotationsByLead(leadId, leadData.storeId, profile),
        getStages(),
        getUsers(),
      ]);
      setLead(leadData);
      setTasks(tasksData);
      setQuotations(quotsData);
      setStages(stagesData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update leadIds if location.state changes
  useEffect(() => {
    if (location.state?.leadIds && Array.isArray(location.state.leadIds)) {
      setLeadIds(location.state.leadIds);
    }
  }, [location.state]);

  // Fallback fetch if leadIds is empty
  useEffect(() => {
    if (leadIds.length === 0 && lead?.storeId) {
      getLeads([lead.storeId], false, null, 100, profile)
        .then((res) => {
          if (res?.data?.length > 0) {
            const ids = res.data.map((l) => l.id);
            setLeadIds(ids);
            try {
              sessionStorage.setItem('crm_active_lead_ids', JSON.stringify(ids));
            } catch (e) {}
          }
        })
        .catch(() => {});
    }
  }, [lead?.storeId, leadIds.length]);

  const leadIndex = leadIds.indexOf(leadId);
  const hasPrevLead = leadIndex > 0;
  const hasNextLead = leadIndex >= 0 && leadIndex < leadIds.length - 1;
  const prevLeadId = hasPrevLead ? leadIds[leadIndex - 1] : null;
  const nextLeadId = hasNextLead ? leadIds[leadIndex + 1] : null;

  // Persist origin page in sessionStorage for resilience across refreshes
  useEffect(() => {
    if (location.state?.from) {
      try {
        sessionStorage.setItem('crm_lead_from', location.state.from);
      } catch (e) {}
    }
  }, [location.state?.from]);

  const handlePrevLead = () => {
    if (prevLeadId) {
      const fromRoute = location.state?.from || sessionStorage.getItem('crm_lead_from');
      navigate(`/leads/${prevLeadId}`, { replace: true, state: { leadIds, from: fromRoute } });
    }
  };

  const handleNextLead = () => {
    if (nextLeadId) {
      const fromRoute = location.state?.from || sessionStorage.getItem('crm_lead_from');
      navigate(`/leads/${nextLeadId}`, { replace: true, state: { leadIds, from: fromRoute } });
    }
  };

  const handleBack = () => {
    const fromRoute = location.state?.from || sessionStorage.getItem('crm_lead_from');
    if (fromRoute && fromRoute !== location.pathname) {
      navigate(fromRoute);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/leads');
    }
  };

  const isModalOpen = showEditModal || showTaskModal || showQuotationModal || !!viewingQuotation;

  const pageSwipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNextLead,
    onSwipeRight: handlePrevLead,
    enabled: !isModalOpen && leadIds.length > 1,
  });

  useEffect(() => {
    if (isModalOpen || leadIds.length <= 1) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') {
        handlePrevLead();
      } else if (e.key === 'ArrowRight') {
        handleNextLead();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, leadIndex, leadIds]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(leadId);
      const fromRoute = location.state?.from || sessionStorage.getItem('crm_lead_from') || '/';
      navigate(fromRoute);
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreLead(leadId);
      loadData();
    } catch (err) {
      console.error('Failed to restore lead:', err);
    }
  };

  const assignedUser = users.find((u) => u.uid === lead?.assignedUserId);
  const currentStage = stages.find((s) => s.id === lead?.stageId);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-10 w-64 rounded-lg" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500 gap-3">
        <p className="text-base font-medium">Lead not found</p>
        <button onClick={handleBack} className="text-sm text-purple-600 underline">Back</button>
      </div>
    );
  }

  return (
    <div {...pageSwipeHandlers} className="flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-slate-900 transition-colors touch-pan-y">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shrink-0 transition-colors">
        {/* Top Control Bar: Back button on left, Navigator & Actions on right */}
        <div className="flex items-center justify-between gap-2">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all shrink-0"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Right: Lead Navigator + Edit/Delete Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {leadIds.length > 1 && (
              <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-700/60 p-0.5 rounded-lg border border-gray-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={handlePrevLead}
                  disabled={!hasPrevLead}
                  className="p-1 rounded text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Previous Lead (Swipe Right / Left Arrow)"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-300 px-1.5 font-mono whitespace-nowrap">
                  {leadIndex + 1}/{leadIds.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextLead}
                  disabled={!hasNextLead}
                  className="p-1 rounded text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Next Lead (Swipe Left / Right Arrow)"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            {lead.deleted ? (
              <button
                onClick={handleRestore}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-green-600 dark:text-emerald-400 hover:text-green-700 dark:hover:text-emerald-300 hover:bg-green-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all border border-green-200 dark:border-emerald-800 font-medium"
              >
                <RefreshCcw size={13} />
                <span>Restore</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-all border border-gray-200 dark:border-slate-600 font-medium shadow-xs"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-red-600 dark:text-rose-400 hover:text-red-700 dark:hover:text-rose-300 bg-red-50/50 dark:bg-rose-950/20 hover:bg-red-100/70 dark:hover:bg-rose-950/40 rounded-lg transition-all border border-red-200 dark:border-rose-900/60 font-medium"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title, Stage, Customer & Lead Number */}
        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {lead.leadNumber && (
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 tracking-wide font-mono bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/80 shrink-0">
                {lead.leadNumber}
              </span>
            )}
            {currentStage && (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white shrink-0 shadow-xs"
                style={{ background: currentStage.color || '#875a7b' }}
              >
                {currentStage.name}
              </span>
            )}
            {lead.deleted && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-red-100 dark:border-rose-900/60 shrink-0">
                <Archive size={11} /> Deleted
              </span>
            )}
            {lead.priority > 0 && (
              <div className="flex items-center text-yellow-400 shrink-0">
                {Array.from({ length: lead.priority }).map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
            )}
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium truncate">
              Customer: <strong className="text-gray-700 dark:text-slate-200 font-medium">{lead.customerName}</strong>
              {lead.company ? ` · ${lead.company}` : ''}
            </span>
          </div>

          <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
            {lead.opportunityTitle || lead.customerName}
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left: Lead info */}
        <div className="w-full md:w-72 shrink-0 bg-white dark:bg-slate-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-700 md:overflow-y-auto p-4 sm:p-5 transition-colors">
          {/* Mobile Accordion Header */}
          <div className="flex items-center justify-between md:hidden mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Lead Information
            </span>
            <button
              type="button"
              onClick={() => setShowMobileDetails(!showMobileDetails)}
              className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 py-0.5 px-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
            >
              <span>{showMobileDetails ? 'Hide details' : 'Show details'}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showMobileDetails ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Quick 1-row summary on mobile when collapsed */}
          {!showMobileDetails && (
            <div className="md:hidden flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-slate-300 py-1">
              <div className="flex items-center gap-2 truncate">
                {lead.phone && (
                  <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                    <Phone size={12} />
                    <PhoneLink phone={lead.phone} />
                  </span>
                )}
                {lead.address && <span className="text-gray-400 truncate">· {lead.address}</span>}
              </div>
              {Number(lead.expectedRevenue) > 0 ? (
                <span className="font-semibold text-gray-800 dark:text-slate-100 shrink-0">
                  ₹{Number(lead.expectedRevenue).toLocaleString('en-IN')}
                </span>
              ) : null}
            </div>
          )}

          {/* Full details (always visible on desktop, toggleable on mobile) */}
          <div className={`${showMobileDetails ? 'block' : 'hidden md:block'} space-y-4`}>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-2">
                Sales Details
              </h3>
              <div className="space-y-0.5">
                <InfoRow icon={IndianRupee} label="Expected Revenue" value={lead.expectedRevenue ? `₹${Number(lead.expectedRevenue).toLocaleString('en-IN')}` : null} />
                <InfoRow 
                  icon={Target} 
                  label="Expected Closing" 
                  value={lead.expectedClosingDate ? formatDate(lead.expectedClosingDate?.toDate?.() || lead.expectedClosingDate) : null} 
                />
                <InfoRow icon={Globe} label="Lead Source" value={lead.source} />
                <InfoRow
                  icon={User}
                  label="Assigned To"
                  value={assignedUser?.displayName || 'Unassigned'}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-700/60">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-2">
                Contact Information
              </h3>
              <div className="space-y-0.5">
                <InfoRow icon={User} label="Customer" value={lead.customerName} />
                <InfoRow icon={Building2} label="Company" value={lead.company} />
                <InfoRow icon={Phone} label="Phone" value={lead.phone ? <PhoneLink phone={lead.phone} /> : null} />
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={MapPin} label="Location" value={lead.address} />
              </div>
            </div>

            {(lead.lookingFor || lead.notes || lead.nextFollowUp) && (
              <div className="pt-3 border-t border-gray-100 dark:border-slate-700/60">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Additional Details
                </h3>
                <div className="space-y-1.5">
                  <InfoRow
                    icon={Calendar}
                    label="Next Follow-up"
                    value={lead.nextFollowUp ? formatDate(lead.nextFollowUp?.toDate?.() || lead.nextFollowUp) : null}
                  />
                  {lead.lookingFor && (
                    <div className="py-1">
                      <p className="text-[11px] text-gray-400 dark:text-slate-400 font-medium mb-0.5">Looking For (Products)</p>
                      <p className="text-sm text-gray-800 dark:text-slate-100 font-medium whitespace-pre-wrap">{lead.lookingFor}</p>
                    </div>
                  )}
                  {lead.notes && (
                    <div className="py-1">
                      <p className="text-[11px] text-gray-400 dark:text-slate-400 font-medium mb-0.5">Notes</p>
                      <p className="text-sm text-gray-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Tasks & Quotations */}
        <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 sm:pt-4 pb-0 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-700 shrink-0 transition-colors">
            {[
              { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
              { id: 'quotations', label: 'Quotations', icon: FileText, count: quotations.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                <span className={`text-xs rounded-full px-1.5 ${
                  activeTab === tab.id ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 md:overflow-y-auto p-4 sm:p-6">
            {/* --- TASKS TAB --- */}
            {activeTab === 'tasks' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700 dark:text-slate-200">Tasks</h3>
                  <button
                    onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-white rounded-lg"
                    style={{ background: '#875a7b' }}
                  >
                    <Plus size={14} /> Add Task
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
                    No tasks yet. Add one above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border cursor-pointer hover:shadow-xs transition-all ${
                          isOverdue(task) ? 'border-red-200 dark:border-rose-900/60 bg-red-50/30 dark:bg-rose-950/10' : 'border-gray-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-100'}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            {task.deadline && (
                              <span className={`text-xs ${isOverdue(task) ? 'text-red-500 dark:text-rose-400 font-medium' : 'text-gray-400 dark:text-slate-400'}`}>
                                📅 {formatDate(task.deadline?.toDate?.() || task.deadline)}
                                {isOverdue(task) && ' · Overdue'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t sm:border-t-0 border-gray-100 dark:border-slate-700/60 pt-2 sm:pt-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-500'}`}>
                            {task.status}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingTask(task); setShowTaskModal(true); }}
                            className="p-1 rounded text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- QUOTATIONS TAB --- */}
            {activeTab === 'quotations' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700 dark:text-slate-200">Quotations</h3>
                  <button
                    onClick={() => {
                      setEditingQuotation(null);
                      setShowQuotationModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-white rounded-lg"
                    style={{ background: '#875a7b' }}
                  >
                    <Plus size={14} /> Generate Quote
                  </button>
                </div>
                {quotations.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
                    No quotations yet. Generate one above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quotations.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => setViewingQuotation(q)}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-sm hover:border-purple-200 dark:hover:border-purple-500 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
                          <FileText size={18} className="text-purple-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">
                              {q.customerDetails?.name || lead?.customerName || 'Unknown customer'} - {q.quotationNumber || q.id.slice(-6).toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                              {q.createdAt ? formatDate(q.createdAt?.toDate?.() || q.createdAt) : 'Just now'}
                              {' · '}
                              <span className="font-semibold text-gray-700 dark:text-slate-200">
                                ₹{(q.totalAmount || 0).toLocaleString('en-IN')}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 w-full sm:w-auto border-t sm:border-t-0 border-gray-100 dark:border-slate-700/60 pt-2 sm:pt-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingQuotation(q);
                              setShowQuotationModal(true);
                            }}
                            className="p-1.5 rounded text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border border-gray-200 dark:border-slate-700 sm:border-transparent"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(q);
                            }}
                            disabled={downloadingId === q.id}
                            className="px-3 py-1.5 text-xs text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all disabled:opacity-50"
                          >
                            {downloadingId === q.id ? (
                              <span className="spinner w-3 h-3 border-purple-600 dark:border-purple-400" />
                            ) : (
                              'Download PDF'
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <LeadModal
          lead={lead}
          stages={stages}
          users={users}
          storeId={lead.storeId}
          onClose={() => setShowEditModal(false)}
          onSaved={loadData}
        />
      )}
      {showTaskModal && (
        <TaskModal
          task={editingTask}
          tasks={tasks}
          onNavigateTask={(newTask) => setEditingTask(newTask)}
          leadId={leadId}
          lead={lead}
          storeId={lead?.storeId || activeStore?.id}
          users={users}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSaved={loadData}
        />
      )}
      {showQuotationModal && (
        <QuotationModal
          lead={lead}
          storeId={activeStore.id}
          editingQuotation={editingQuotation}
          onClose={() => {
            setShowQuotationModal(false);
            setEditingQuotation(null);
          }}
          onSaved={loadData}
        />
      )}
      {viewingQuotation && (
        <QuotationDetailModal
          quotation={viewingQuotation}
          onClose={() => setViewingQuotation(null)}
          isDownloading={downloadingId === viewingQuotation.id}
          onEdit={() => {
            setViewingQuotation(null);
            setEditingQuotation(viewingQuotation);
            setShowQuotationModal(true);
          }}
          onDownload={() => handleDownload(viewingQuotation)}
        />
      )}
    </div>
  );
};

export default LeadDetailPage;

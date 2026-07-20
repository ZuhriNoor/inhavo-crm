// LeadDetailPage — full lead detail view with tasks and quotations
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, Phone, Mail, MapPin, Building2,
  Calendar, User, StickyNote, Plus, CheckSquare, FileText, Tag,
  Globe, IndianRupee, Target, Star, Briefcase
} from 'lucide-react';
import { getLead, deleteLead } from '../services/leadsService';
import { getTasksByLead } from '../services/tasksService';
import { getQuotationsByLead } from '../services/quotationsService';
import { getStages } from '../services/stagesService';
import { getUsers } from '../services/usersService';
import { formatDate, isOverdue } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import LeadModal from '../components/leads/LeadModal';
import TaskModal from '../components/tasks/TaskModal';
import QuotationModal from '../components/quotations/QuotationModal';
import { pdf } from '@react-pdf/renderer';
import QuotationPDF from '../utils/pdfTemplate';

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  );
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

const LeadDetailPage = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { activeStore } = useStore();

  const [lead, setLead] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'quotations'

  const [showEditModal, setShowEditModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadData, tasksData, quotsData, stagesData, usersData] = await Promise.all([
        getLead(leadId),
        getTasksByLead(leadId),
        getQuotationsByLead(leadId),
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    await deleteLead(leadId);
    navigate('/');
  };

  const assignedUser = users.find((u) => u.uid === lead?.assignedUserId);
  const currentStage = stages.find((s) => s.id === lead?.stageId);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <p>Lead not found.</p>
        <Link to="/" className="text-purple-600 text-sm hover:underline">
          ← Back to board
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-800 truncate">
              {lead.opportunityTitle || lead.customerName}
            </h1>
            {lead.priority > 0 && (
              <div className="flex items-center text-yellow-400">
                {Array.from({ length: lead.priority }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {lead.customerName}{lead.company ? ` · ${lead.company}` : ''}
          </p>
        </div>
        {/* Stage badge */}
        {currentStage && (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
            style={{ background: currentStage.color || '#875a7b' }}
          >
            {currentStage.name}
          </span>
        )}
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Lead info */}
        <div className="w-72 shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-5 space-y-1">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Sales Details
          </h3>
          <InfoRow icon={IndianRupee} label="Expected Revenue" value={lead.expectedRevenue ? `₹${lead.expectedRevenue.toLocaleString('en-IN')}` : null} />
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

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-6 pt-6 border-t border-gray-100">
            Contact Information
          </h3>
          <InfoRow icon={User} label="Customer" value={lead.customerName} />
          <InfoRow icon={Building2} label="Company" value={lead.company} />
          <InfoRow icon={Phone} label="Phone" value={lead.phone} />
          <InfoRow icon={Mail} label="Email" value={lead.email} />
          <InfoRow icon={MapPin} label="Location" value={lead.address} />

          {(lead.lookingFor || lead.notes || lead.nextFollowUp) && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Additional Details
              </h3>
              <InfoRow
                icon={Calendar}
                label="Next Follow-up"
                value={lead.nextFollowUp ? formatDate(lead.nextFollowUp?.toDate?.() || lead.nextFollowUp) : null}
              />
              {lead.lookingFor && (
                <div className="py-2">
                  <p className="text-xs text-gray-400 mb-1">Looking For (Products)</p>
                  <p className="text-sm text-gray-800 font-medium whitespace-pre-wrap">{lead.lookingFor}</p>
                </div>
              )}
              {lead.notes && (
                <div className="py-2 mt-2">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Tasks & Quotations */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 pt-4 pb-0 bg-gray-50 border-b border-gray-200 shrink-0">
            {[
              { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
              { id: 'quotations', label: 'Quotations', icon: FileText, count: quotations.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                <span className={`text-xs rounded-full px-1.5 ${
                  activeTab === tab.id ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* --- TASKS TAB --- */}
            {activeTab === 'tasks' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">Tasks</h3>
                  <button
                    onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg"
                    style={{ background: '#875a7b' }}
                  >
                    <Plus size={14} /> Add Task
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    No tasks yet. Add one above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 p-3 bg-white rounded-xl border transition-all ${
                          isOverdue(task) ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            {task.deadline && (
                              <span className={`text-xs ${isOverdue(task) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                📅 {formatDate(task.deadline?.toDate?.() || task.deadline)}
                                {isOverdue(task) && ' · Overdue'}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-500'}`}>
                          {task.status}
                        </span>
                        <button
                          onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        >
                          <Edit2 size={13} />
                        </button>
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
                  <h3 className="font-semibold text-gray-700">Quotations</h3>
                  <button
                    onClick={() => setShowQuotationModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg"
                    style={{ background: '#875a7b' }}
                  >
                    <Plus size={14} /> Generate Quote
                  </button>
                </div>
                {quotations.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    No quotations yet. Generate one above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quotations.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-200"
                      >
                        <FileText size={18} className="text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {q.customerDetails?.name || lead?.customerName || 'Unknown customer'} - {q.quotationNumber || q.id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {q.createdAt ? formatDate(q.createdAt?.toDate?.() || q.createdAt) : 'Just now'}
                            {' · '}
                            ₹{(q.totalAmount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownload(q)}
                          disabled={downloadingId === q.id}
                          className="px-3 py-1.5 text-xs text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-all disabled:opacity-50"
                        >
                          {downloadingId === q.id ? (
                            <span className="spinner w-3 h-3 border-purple-600" />
                          ) : (
                            'Download PDF'
                          )}
                        </button>
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
          leadId={leadId}
          storeId={lead?.storeId || activeStore?.id}
          users={users}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSaved={loadData}
        />
      )}
      {showQuotationModal && (
        <QuotationModal
          lead={lead}
          storeId={lead?.storeId || activeStore?.id}
          onClose={() => setShowQuotationModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
};

export default LeadDetailPage;

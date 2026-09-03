// TasksPage — standalone tasks list with filtering, sorting and grouping
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight, User, ExternalLink } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { getTasks } from '../services/tasksService';
import { getUsers } from '../services/usersService';
import { getLeads } from '../services/leadsService';
import { formatDate, isOverdue, isDueSoon } from '../utils/helpers';
import TaskModal from '../components/tasks/TaskModal';
import ListControlsBar from '../components/shared/ListControlsBar';
import { applyListControls } from '../utils/listControls';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

const FILTER_OPTIONS = ['all', 'pending', 'in-progress', 'completed'];
const ALL_RECORDS_SIZE = 5000;
const PAGE_SIZE = 15;

const TasksPage = () => {
  const navigate = useNavigate();
  const { activeStore } = useStore();
  const { user, isAdmin, profile } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState('all'); // 'all' | status
  const [controls, setControls] = useState({ filters: [], sortBy: '', sortDir: 'asc', groupBy: '' });
  const [page, setPage] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [activeStore]);

  const fetchTasks = async () => {
    if (!activeStore) return;
    setLoading(true);

    try {
      const [tasksResponse, usersData, leadsResponse] = await Promise.all([
        getTasks([activeStore.id], null, ALL_RECORDS_SIZE, profile),
        getUsers(),
        getLeads([activeStore.id], false, null, ALL_RECORDS_SIZE, profile),
      ]);

      setTasks(tasksResponse.data);
      setUsers(usersData);
      setLeads(leadsResponse?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(0);
    fetchTasks();
  };

  const getUser = (uid) => users.find((u) => u.uid === uid);
  const leadsMap = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);

  const fields = useMemo(() => [
    { key: 'title', label: 'Title', type: 'text' },
    {
      key: 'status', label: 'Status', type: 'select',
      options: Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label })),
    },
    {
      key: 'assignedUserId', label: 'Assignee', type: 'select',
      options: users.map((u) => ({ value: u.uid, label: u.displayName })),
    },
    { key: 'deadline', label: 'Deadline', type: 'date', getValue: (t) => t.deadline?.toDate?.() || t.deadline },
  ], [users]);

  const baseFiltered = tasks.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    return true;
  });

  const { flat, groups } = useMemo(
    () => applyListControls(baseFiltered, controls, fields),
    [baseFiltered, controls, fields]
  );

  useEffect(() => { setPage(0); }, [controls, filter]);

  const totalPages = Math.max(1, Math.ceil(flat.length / PAGE_SIZE));
  const pagedFlat = flat.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const filteredTasks = groups ? flat : pagedFlat;

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const renderTaskRows = (list) => (
    <div className="space-y-2">
      {list.map((task) => {
        const overdue = isOverdue(task);
        const dueSoon = isDueSoon(task);
        const cfg = STATUS_CONFIG[task.status];
        const StatusIcon = cfg?.icon || Clock;
        const assignee = getUser(task.assignedUserId);
        const lead = task.leadId ? leadsMap.get(task.leadId) : null;
        const leadTitle = task.leadTitle || lead?.opportunityTitle || lead?.customerName;
        const leadNum = task.leadNumber || lead?.leadNumber;

        return (
          <div
            key={task.id}
            onClick={() => handleEdit(task)}
            className={`p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${
              overdue
                ? 'border-red-200 dark:border-rose-900/60 bg-red-50/20 dark:bg-rose-950/10'
                : dueSoon
                ? 'border-yellow-200 dark:border-amber-900/60 bg-yellow-50/20 dark:bg-amber-950/10'
                : 'border-gray-200 dark:border-slate-700'
            }`}
          >
            {/* Top row: Status Icon + Title & Description on left, Assignee & Status badges on right */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 mt-0.5 ${cfg?.color || 'bg-gray-100 text-gray-500'}`}>
                  <StatusIcon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${task.status === 'completed' ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-100'}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-400 dark:text-slate-400 truncate mt-0.5">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Badges on right */}
              <div className="flex items-center gap-1.5 shrink-0">
                {assignee && (
                  <span className="text-[11px] font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-600">
                    {assignee.displayName}
                  </span>
                )}
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg?.color || ''}`}>
                  {cfg?.label || task.status}
                </span>
              </div>
            </div>

            {/* Bottom Row: Connected Lead Chip & Deadline */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-700/60">
              {task.leadId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/leads/${task.leadId}`, { state: { from: '/tasks' } });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/80 transition-colors group/lead cursor-pointer max-w-full min-w-0"
                  title="Open Connected Lead"
                >
                  <User size={11} className="text-purple-500 dark:text-purple-400 shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-[220px]">
                    {leadTitle || 'Connected Lead'}
                  </span>
                  {leadNum && (
                    <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold shrink-0">
                      [{leadNum}]
                    </span>
                  )}
                  <ExternalLink size={10} className="text-purple-400 group-hover/lead:translate-x-0.5 transition-transform shrink-0" />
                </button>
              ) : (
                <span className="text-xs text-gray-400 dark:text-slate-500 italic">Standalone task</span>
              )}

              {task.deadline && (
                <span className={`text-xs flex items-center gap-1 shrink-0 ${overdue ? 'text-red-500 dark:text-rose-400 font-medium' : dueSoon ? 'text-yellow-600 dark:text-amber-400 font-medium' : 'text-gray-400 dark:text-slate-500'}`}>
                  {overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
                  {formatDate(task.deadline?.toDate?.() || task.deadline)}
                  {overdue && ' · Overdue'}
                  {dueSoon && !overdue && ' · Due soon'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!activeStore) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a store to view tasks.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 sm:px-6 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shrink-0 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 truncate">Tasks</h1>
            <span className="text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full shrink-0">
              {flat.length} total
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { setEditingTask(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm text-white font-medium rounded-lg"
              style={{ background: '#875a7b' }}
            >
              <Plus size={14} /> New Task
            </button>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <ListControlsBar fields={fields} value={controls} onChange={setControls} />

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

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-slate-500 gap-2">
            <CheckCircle2 size={36} className="opacity-30" />
            <p className="text-sm">
              {filter === 'all' ? 'No tasks yet.' : `No ${filter} tasks.`}
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
                {renderTaskRows(group.items)}
              </div>
            ))}
          </div>
        ) : (
          renderTaskRows(filteredTasks)
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          tasks={filteredTasks}
          onNavigateTask={(newTask) => setEditingTask(newTask)}
          storeId={activeStore?.id}
          users={users}
          leads={leads}
          lead={editingTask?.leadId ? leadsMap.get(editingTask.leadId) : null}
          onClose={() => { setShowModal(false); setEditingTask(null); }}
          onSaved={handleRefresh}
        />
      )}
    </div>
  );
};

export default TasksPage;

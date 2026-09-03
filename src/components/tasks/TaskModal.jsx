// TaskModal — Task Detail view with seamless Edit mode, Lead connectivity, and Swipe/Arrow navigation
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Edit2,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Phone,
  Trash2,
  Link2,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createTask,
  updateTask,
  completeTask,
  deleteTask,
} from '../../services/tasksService';
import { getLead } from '../../services/leadsService';
import {
  notifyTaskDueSoon,
  notifyTaskOverdue,
} from '../../services/notificationsService';
import {
  toInputDate,
  fromInputDate,
  isDueSoon,
  isOverdue,
  formatDate,
  getInitials,
  stringToColor,
} from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import DateInput from '../shared/DateInput';
import PhoneLink from '../shared/PhoneLink';
import useSwipeGesture from '../../hooks/useSwipeGesture';

const inputCls =
  'w-full px-3 py-2 text-sm bg-white dark:bg-slate-700/70 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    badge: 'bg-yellow-100 dark:bg-amber-950/60 text-yellow-700 dark:text-amber-300 border border-yellow-200 dark:border-amber-800',
    icon: Clock,
  },
  'in-progress': {
    label: 'In Progress',
    badge: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    icon: RefreshCw,
  },
  completed: {
    label: 'Completed',
    badge: 'bg-green-100 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-300 border border-green-200 dark:border-emerald-800',
    icon: CheckCircle2,
  },
};

const TaskModal = ({
  task,
  tasks = [],
  onNavigateTask,
  leadId,
  lead,
  leads = [],
  storeId,
  users = [],
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active task for navigation within the modal
  const [activeTask, setActiveTask] = useState(task);

  useEffect(() => {
    setActiveTask(task);
  }, [task]);

  // If task is provided, open in Detail View mode. If task is null, open in Create mode.
  const [isEditing, setIsEditing] = useState(!task);
  const [leadData, setLeadData] = useState(lead || null);
  const [loadingLead, setLoadingLead] = useState(false);

  const currentLeadId = leadId || activeTask?.leadId;

  // Task list navigation index
  const taskIndex = tasks && activeTask ? tasks.findIndex((t) => t.id === activeTask.id) : -1;
  const hasPrevTask = taskIndex > 0;
  const hasNextTask = taskIndex >= 0 && taskIndex < tasks.length - 1;

  const handlePrevTask = () => {
    if (hasPrevTask) {
      const prev = tasks[taskIndex - 1];
      setActiveTask(prev);
      onNavigateTask?.(prev);
    }
  };

  const handleNextTask = () => {
    if (hasNextTask) {
      const next = tasks[taskIndex + 1];
      setActiveTask(next);
      onNavigateTask?.(next);
    }
  };

  // Mobile / Tablet swipe gesture support
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNextTask,
    onSwipeRight: handlePrevTask,
    enabled: !isEditing && tasks.length > 1,
  });

  // Desktop keyboard arrow navigation
  useEffect(() => {
    if (isEditing || tasks.length <= 1) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') {
        handlePrevTask();
      } else if (e.key === 'ArrowRight') {
        handleNextTask();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, taskIndex, tasks]);

  // Fetch lead details if not provided via prop or when active task changes
  useEffect(() => {
    if (lead) {
      setLeadData(lead);
      return;
    }
    if (currentLeadId) {
      let isMounted = true;
      setLoadingLead(true);
      getLead(currentLeadId)
        .then((data) => {
          if (isMounted) setLeadData(data);
        })
        .catch((err) => console.error('Failed to fetch lead info for task:', err))
        .finally(() => {
          if (isMounted) setLoadingLead(false);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setLeadData(null);
    }
  }, [currentLeadId, lead]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: activeTask?.title || '',
      description: activeTask?.description || '',
      assignedUserId: activeTask?.assignedUserId || user?.uid || '',
      deadline: activeTask?.deadline ? toInputDate(activeTask.deadline) : '',
      status: activeTask?.status || 'pending',
      leadId: leadId || activeTask?.leadId || '',
    },
  });

  useEffect(() => {
    if (activeTask) {
      reset({
        title: activeTask.title || '',
        description: activeTask.description || '',
        assignedUserId: activeTask.assignedUserId || '',
        deadline: activeTask.deadline ? toInputDate(activeTask.deadline) : '',
        status: activeTask.status || 'pending',
        leadId: leadId || activeTask.leadId || '',
      });
    }
  }, [activeTask, leadId, reset]);

  const handleOpenLead = () => {
    const targetId = leadData?.id || currentLeadId;
    if (targetId) {
      onClose();
      navigate(`/leads/${targetId}`);
    }
  };

  const handleToggleComplete = async () => {
    if (!activeTask) return;
    try {
      if (activeTask.status === 'completed') {
        await updateTask(activeTask.id, { status: 'pending', completedAt: null });
        setActiveTask({ ...activeTask, status: 'pending', completedAt: null });
      } else {
        await completeTask(activeTask.id);
        setActiveTask({ ...activeTask, status: 'completed', completedAt: new Date() });
      }
      onSaved?.();
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  const handleDelete = async () => {
    if (!activeTask) return;
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(activeTask.id);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const onSubmit = async (data) => {
    const deadline = data.deadline ? fromInputDate(data.deadline) : null;
    const targetLeadId = data.leadId || leadId || activeTask?.leadId || null;

    const payload = {
      title: data.title,
      description: data.description || '',
      assignedUserId: data.assignedUserId || '',
      status: data.status || 'pending',
      deadline,
      leadId: targetLeadId,
      storeId: storeId || activeTask?.storeId,
      createdBy: activeTask?.createdBy || user?.uid,
    };

    try {
      if (activeTask) {
        await updateTask(activeTask.id, payload);
        setActiveTask({ ...activeTask, ...payload });
      } else {
        const newId = await createTask(payload);
        if (deadline && data.assignedUserId) {
          const mockTask = { ...payload, status: 'pending', deadline };
          if (isOverdue(mockTask)) {
            await notifyTaskOverdue(data.assignedUserId, data.title, newId);
          } else if (isDueSoon(mockTask)) {
            await notifyTaskDueSoon(data.assignedUserId, data.title, newId);
          }
        }
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const assignee = users?.find((u) => u.uid === (activeTask?.assignedUserId || watch('assignedUserId')));
  const statusCfg = STATUS_CONFIG[activeTask?.status || 'pending'] || STATUS_CONFIG.pending;
  const overdue = activeTask ? isOverdue(activeTask) : false;
  const dueSoon = activeTask ? isDueSoon(activeTask) : false;

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/40 dark:bg-slate-950/70 backdrop-blur-xs">
      <div
        {...swipeHandlers}
        className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-gray-800 dark:text-slate-100 transition-all select-none touch-pan-y"
      >
        {/* ========================================================================= */}
        {/* VIEW MODE (TASK DETAIL) */}
        {/* ========================================================================= */}
        {!isEditing && activeTask ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
              <div className="flex items-start gap-3 min-w-0 pr-3">
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-all ${
                    activeTask.status === 'completed'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-300 dark:border-slate-600 hover:border-purple-500'
                  }`}
                  title={activeTask.status === 'completed' ? 'Mark incomplete' : 'Mark completed'}
                >
                  {activeTask.status === 'completed' && <Check size={13} strokeWidth={3} />}
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusCfg.badge}`}>
                      {statusCfg.label}
                    </span>
                    {activeTask.deadline && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                          overdue
                            ? 'bg-red-100 dark:bg-rose-950/60 text-red-700 dark:text-rose-300'
                            : dueSoon
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                        }`}
                      >
                        {overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
                        {overdue ? 'Overdue' : dueSoon ? 'Due Soon' : 'On Track'}
                      </span>
                    )}
                  </div>
                  <h2
                    className={`text-lg font-bold leading-snug ${
                      activeTask.status === 'completed'
                        ? 'line-through text-gray-400 dark:text-slate-500'
                        : 'text-gray-900 dark:text-slate-100'
                    }`}
                  >
                    {activeTask.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Desktop Arrow Navigator */}
                {tasks.length > 1 && (
                  <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-700/60 p-0.5 rounded-lg border border-gray-200 dark:border-slate-600 mr-1">
                    <button
                      type="button"
                      onClick={handlePrevTask}
                      disabled={!hasPrevTask}
                      className="p-1 rounded text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Previous Task (Swipe Right / Left Arrow)"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 px-1 font-mono whitespace-nowrap">
                      {taskIndex + 1}/{tasks.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextTask}
                      disabled={!hasNextTask}
                      className="p-1 rounded text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Next Task (Swipe Left / Right Arrow)"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700 transition-all"
                  title="Edit task"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">
              {/* Connected Lead Card */}
              {loadingLead ? (
                <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-900/60" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-purple-200 dark:bg-purple-900/60 rounded w-1/3" />
                    <div className="h-3 bg-purple-100 dark:bg-purple-900/40 rounded w-1/2" />
                  </div>
                </div>
              ) : leadData ? (
                <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-xl p-3.5 sm:p-4 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {leadData.leadNumber && (
                            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-700 dark:text-purple-300 bg-purple-200/70 dark:bg-purple-900/70 px-1.5 py-0.5 rounded font-mono">
                              {leadData.leadNumber}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                            Connected Lead
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-1 truncate">
                          {leadData.opportunityTitle || leadData.customerName || 'Lead Opportunity'}
                        </h4>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-2.5 flex-wrap">
                          {leadData.customerName && (
                            <span>
                              Customer: <strong className="text-gray-700 dark:text-slate-300 font-medium">{leadData.customerName}</strong>
                            </span>
                          )}
                          {leadData.phone && (
                            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                              <Phone size={11} />
                              <PhoneLink phone={leadData.phone} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenLead}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-all shrink-0 cursor-pointer"
                      style={{ background: '#875a7b' }}
                      title="Open Lead Details"
                    >
                      <span>Open Lead</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-xs text-gray-400 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Link2 size={14} /> Standalone task (No lead connected)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                  >
                    + Link to a Lead
                  </button>
                </div>
              )}

              {/* Assignee & Deadline Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Assignee Card */}
                <div className="p-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-100 dark:border-slate-700 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: stringToColor(assignee?.displayName || 'Unassigned') }}
                  >
                    {getInitials(assignee?.displayName || '?')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 dark:text-slate-400 uppercase font-medium">
                      Assigned To
                    </p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
                      {assignee?.displayName || 'Unassigned'}
                    </p>
                  </div>
                </div>

                {/* Deadline Card */}
                <div
                  className={`p-3 rounded-xl border flex items-center gap-3 ${
                    overdue
                      ? 'bg-red-50/50 dark:bg-rose-950/20 border-red-200 dark:border-rose-900/60'
                      : dueSoon
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                      : 'bg-gray-50 dark:bg-slate-700/40 border-gray-100 dark:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      overdue
                        ? 'bg-red-100 text-red-600 dark:bg-rose-900/50 dark:text-rose-300'
                        : dueSoon
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-gray-200/80 text-gray-600 dark:bg-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {overdue ? <AlertCircle size={16} /> : <Calendar size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 dark:text-slate-400 uppercase font-medium">
                      Deadline
                    </p>
                    <p
                      className={`text-sm font-semibold truncate ${
                        overdue
                          ? 'text-red-600 dark:text-rose-400'
                          : dueSoon
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-800 dark:text-slate-200'
                      }`}
                    >
                      {activeTask.deadline
                        ? formatDate(activeTask.deadline?.toDate?.() || activeTask.deadline)
                        : 'No deadline'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description Block */}
              <div>
                <p className="text-[11px] text-gray-400 dark:text-slate-400 uppercase font-medium mb-1.5">
                  Description
                </p>
                <div className="p-3.5 bg-gray-50 dark:bg-slate-700/30 rounded-xl border border-gray-100 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[70px]">
                  {activeTask.description ? (
                    activeTask.description
                  ) : (
                    <span className="text-gray-400 dark:text-slate-500 italic">
                      No description provided.
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile swipe hint */}
              {tasks.length > 1 && (
                <div className="sm:hidden text-center pt-1">
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">
                    👈 Swipe left / right to navigate tasks 👉
                  </span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50/50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    activeTask.status === 'completed'
                      ? 'text-yellow-700 dark:text-amber-300 bg-yellow-50 dark:bg-amber-950/30 border-yellow-200 dark:border-amber-800 hover:bg-yellow-100'
                      : 'text-green-700 dark:text-emerald-300 bg-green-50 dark:bg-emerald-950/30 border-green-200 dark:border-emerald-800 hover:bg-green-100'
                  }`}
                >
                  <Check size={14} />
                  {activeTask.status === 'completed' ? 'Mark Pending' : '✓ Mark Completed'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 text-red-500 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/40 rounded-lg border border-red-200 dark:border-rose-800 transition-all"
                  title="Delete Task"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <Edit2 size={13} />
                  Edit Task
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors"
                  style={{ background: '#875a7b' }}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* EDIT / CREATE MODE */
          /* ========================================================================= */
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
                {activeTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    {...register('title', { required: 'Title is required' })}
                    className={inputCls}
                    placeholder="e.g. Call client regarding quotation confirmation"
                  />
                  {errors.title && (
                    <p className="mt-0.5 text-xs text-red-500">{errors.title.message}</p>
                  )}
                </div>

                {/* Lead Association Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                    Connected Lead / Enquiry
                  </label>
                  {leadId ? (
                    /* Locked to current lead if opened from LeadDetailPage */
                    <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-xs text-purple-700 dark:text-purple-300 flex items-center justify-between">
                      <span className="truncate">
                        Connected to current lead: <strong>{leadData?.customerName || leadData?.opportunityTitle || leadId}</strong>
                      </span>
                      <span className="text-[10px] bg-purple-200 dark:bg-purple-900 px-1.5 py-0.5 rounded font-mono shrink-0">
                        {leadData?.leadNumber || 'CURRENT'}
                      </span>
                    </div>
                  ) : (
                    /* Selectable from store leads */
                    <select {...register('leadId')} className={inputCls}>
                      <option value="">None (Standalone task)</option>
                      {leads?.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.leadNumber ? `[${l.leadNumber}] ` : ''}
                          {l.opportunityTitle || l.customerName || 'Untitled'}
                          {l.customerName && l.opportunityTitle ? ` (${l.customerName})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className={inputCls + ' resize-none'}
                    placeholder="Add details, notes, or next action items…"
                  />
                </div>

                {/* Assigned To + Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                      Assigned To
                    </label>
                    <select {...register('assignedUserId')} className={inputCls}>
                      <option value="">Unassigned</option>
                      {users?.map((u) => (
                        <option key={u.uid || u.id} value={u.uid || u.id}>
                          {u.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                      Deadline
                    </label>
                    <DateInput
                      {...register('deadline')}
                      displayValue={watch('deadline')}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select {...register('status')} className={inputCls}>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50/50 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTask) {
                      setIsEditing(false); // Return to view mode
                    } else {
                      onClose(); // Close modal
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-sm"
                  style={{ background: '#875a7b' }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner w-3 h-3 border-white" /> Saving…
                    </>
                  ) : activeTask ? (
                    'Save Changes'
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default TaskModal;

// TaskModal — Create/Edit task in a modal
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { createTask, updateTask, completeTask, deleteTask } from '../../services/tasksService';
import {
  notifyTaskDueSoon,
  notifyTaskOverdue,
} from '../../services/notificationsService';
import { toInputDate, fromInputDate, isDueSoon, isOverdue } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all';

const TaskModal = ({ task, leadId, storeId, users, onClose, onSaved }) => {
  const { user } = useAuth();
  const isEditing = !!task;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      assignedUserId: user?.uid || '',
      deadline: '',
      status: 'pending',
    },
  });

  useEffect(() => {
    if (task) {
      reset({
        title: task.title || '',
        description: task.description || '',
        assignedUserId: task.assignedUserId || '',
        deadline: task.deadline ? toInputDate(task.deadline) : '',
        status: task.status || 'pending',
      });
    }
  }, [task, reset]);

  const onSubmit = async (data) => {
    const deadline = data.deadline ? fromInputDate(data.deadline) : null;
    const payload = {
      ...data,
      deadline,
      leadId: leadId || null,
      storeId,
      createdBy: user?.uid,
    };

    try {
      if (isEditing) {
        await updateTask(task.id, payload);
      } else {
        const newId = await createTask(payload);
        // Check deadline notifications
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

  const handleComplete = async () => {
    if (!task) return;
    await completeTask(task.id);
    onSaved?.();
    onClose();
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm('Delete this task?')) return;
    await deleteTask(task.id);
    onSaved?.();
    onClose();
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input
              {...register('title', { required: 'Title is required' })}
              className={inputCls}
              placeholder="Task title"
            />
            {errors.title && (
              <p className="mt-0.5 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={2}
              className={inputCls + ' resize-none'}
              placeholder="Optional description…"
            />
          </div>

          {/* Assigned To + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
              <input {...register('deadline')} type="date" className={inputCls} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select {...register('status')} className={inputCls}>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {isEditing && task?.status !== 'completed' && (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg border border-green-200 transition-all"
                >
                  ✓ Complete
                </button>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-all"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-60"
                style={{ background: '#875a7b' }}
              >
                {isSubmitting ? (
                  <><span className="spinner w-3 h-3 border-white" /> Saving…</>
                ) : (
                  isEditing ? 'Save' : 'Create Task'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;

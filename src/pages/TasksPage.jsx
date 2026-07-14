// TasksPage — standalone tasks list with filtering
import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { getTasks } from '../services/tasksService';
import { getUsers } from '../services/usersService';
import { formatDate, isOverdue, isDueSoon } from '../utils/helpers';
import TaskModal from '../components/tasks/TaskModal';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

const FILTER_OPTIONS = ['all', 'pending', 'in-progress', 'completed'];

const TasksPage = () => {
  const { activeStore } = useStore();
  const { user, isAdmin } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | status

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const loadData = useCallback(async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const [tasksData, usersData] = await Promise.all([
        getTasks([activeStore.id]),
        getUsers(),
      ]);
      setTasks(tasksData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = tasks.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    return true;
  });

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const getUser = (uid) => users.find((u) => u.uid === uid);

  if (!activeStore) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a store to view tasks.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-gray-800">Tasks</h1>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {filteredTasks.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setEditingTask(null); setShowModal(true); }}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-white font-medium rounded-lg"
            style={{ background: '#875a7b' }}
          >
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-6 py-2 bg-white border-b border-gray-100 shrink-0 overflow-x-auto">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
              filter === f
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
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
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <CheckCircle2 size={36} className="opacity-30" />
            <p className="text-sm">
              {filter === 'all' ? 'No tasks yet.' : `No ${filter} tasks.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => {
              const overdue = isOverdue(task);
              const dueSoon = isDueSoon(task);
              const cfg = STATUS_CONFIG[task.status];
              const StatusIcon = cfg?.icon || Clock;
              const assignee = getUser(task.assignedUserId);

              return (
                <div
                  key={task.id}
                  onClick={() => handleEdit(task)}
                  className={`flex items-start gap-4 p-4 bg-white rounded-xl border cursor-pointer hover:shadow-sm transition-all ${
                    overdue ? 'border-red-200' : dueSoon ? 'border-yellow-200' : 'border-gray-200'
                  }`}
                >
                  {/* Status icon */}
                  <div className={`p-2 rounded-lg ${cfg?.color || 'bg-gray-100 text-gray-500'}`}>
                    <StatusIcon size={15} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {task.deadline && (
                        <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : dueSoon ? 'text-yellow-600 font-medium' : 'text-gray-400'}`}>
                          {overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
                          {formatDate(task.deadline?.toDate?.() || task.deadline)}
                          {overdue && ' · Overdue'}
                          {dueSoon && !overdue && ' · Due soon'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assignee */}
                  {assignee && (
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-200 shrink-0">
                      {assignee.displayName}
                    </span>
                  )}

                  {/* Status badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg?.color || ''}`}>
                    {cfg?.label || task.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          storeId={activeStore?.id}
          users={users}
          onClose={() => { setShowModal(false); setEditingTask(null); }}
          onSaved={loadData}
        />
      )}
    </div>
  );
};

export default TasksPage;

// Topbar — search + notification bell + breadcrumb
import { Bell, Search, X, Check, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from '../../utils/helpers';
import { useLocation } from 'react-router-dom';

const BREADCRUMB_MAP = {
  '/': 'CRM / Kanban',
  '/tasks': 'Tasks',
  '/quotations': 'Quotations',
  '/admin/users': 'Admin / Users',
  '/admin/stores': 'Admin / Stores',
  '/admin/pipeline': 'Admin / Pipeline',
};

const NOTIF_ICONS = {
  lead_assigned: '👤',
  task_due: '⏰',
  task_overdue: '🔴',
};

const Topbar = () => {
  const { notifications, unreadCount, readOne, readAll, remove } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState('');
  const panelRef = useRef(null);
  const { pathname } = useLocation();

  const breadcrumb = BREADCRUMB_MAP[pathname] || 'CRM';

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex items-center h-14 px-6 bg-white border-b border-gray-200 shrink-0 gap-4">
      {/* Breadcrumb */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-700">{breadcrumb}</p>
      </div>

      {/* Search */}
      <div className="relative hidden sm:flex items-center">
        <Search size={15} className="absolute left-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search leads…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-1.5 text-sm bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 w-56 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Notification Bell */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setNotifOpen((o) => !o)}
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="notification-badge absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">
                Notifications {unreadCount > 0 && <span className="text-purple-600">({unreadCount})</span>}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={readAll}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  <Bell size={32} className="mx-auto mb-2 opacity-30" />
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group ${
                      !n.read ? 'bg-purple-50/50' : ''
                    }`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">
                      {NOTIF_ICONS[n.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {n.createdAt ? formatDistanceToNow(n.createdAt.toDate()) : 'Just now'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <button
                          onClick={() => readOne(n.id)}
                          className="p-1 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                          title="Mark read"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => remove(n.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;

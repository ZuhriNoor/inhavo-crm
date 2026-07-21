// Topbar — search + notification bell + breadcrumb + theme toggle
import { Bell, Search, X, Check, Trash2, Menu, Sun, Moon, Monitor } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from '../../utils/helpers';
import { useLocation, useNavigate } from 'react-router-dom';

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

const Topbar = ({ onMenuClick }) => {
  const { notifications, unreadCount, readOne, readAll, remove } = useNotifications();
  const { theme, setTheme, isDark } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [search, setSearch] = useState('');
  const panelRef = useRef(null);
  const themeRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const breadcrumb = BREADCRUMB_MAP[pathname] || 'CRM';

  const handleNotificationClick = (n) => {
    if (!n.read) readOne(n.id);
    setNotifOpen(false);
    
    if (n.type === 'lead_assigned' && n.relatedId) {
      navigate(`/leads/${n.relatedId}`);
    } else if ((n.type === 'task_due' || n.type === 'task_overdue')) {
      navigate('/tasks');
    }
  };

  // Close panels on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex items-center h-14 px-4 sm:px-6 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shrink-0 gap-3 sm:gap-4 transition-colors">
      {/* Mobile Menu Toggle */}
      <button 
        onClick={onMenuClick}
        className="md:hidden p-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{breadcrumb}</p>
      </div>

      {/* Search */}
      <div className="relative hidden sm:flex items-center">
        <Search size={15} className="absolute left-3 text-gray-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search leads…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-1.5 text-sm bg-gray-100 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 dark:focus:border-purple-400 w-56 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Theme Toggle */}
      <div className="relative" ref={themeRef}>
        <button
          onClick={() => setThemeOpen((o) => !o)}
          className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-200 transition-all"
          title="Change theme"
        >
          {isDark ? <Moon size={19} className="text-purple-400" /> : <Sun size={19} className="text-amber-500" />}
        </button>

        {themeOpen && (
          <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-1 z-50 overflow-hidden">
            <button
              onClick={() => { setTheme('light'); setThemeOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Sun size={14} className="text-amber-500" /> Light
            </button>
            <button
              onClick={() => { setTheme('dark'); setThemeOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Moon size={14} className="text-purple-400" /> Dark
            </button>
            <button
              onClick={() => { setTheme('system'); setThemeOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${
                theme === 'system'
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Monitor size={14} className="text-blue-500" /> System
            </button>
          </div>
        )}
      </div>

      {/* Notification Bell */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setNotifOpen((o) => !o)}
          className="relative p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-200 transition-all"
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
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-semibold text-gray-800 dark:text-slate-200 text-sm">
                Notifications {unreadCount > 0 && <span className="text-purple-600 dark:text-purple-400">({unreadCount})</span>}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={readAll}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium flex items-center gap-1"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
                  <Bell size={32} className="mx-auto mb-2 opacity-30" />
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer ${
                      !n.read ? 'bg-purple-50/50 dark:bg-purple-900/20' : ''
                    }`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">
                      {NOTIF_ICONS[n.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'text-gray-800 dark:text-slate-100 font-medium' : 'text-gray-600 dark:text-slate-400'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        {n.createdAt ? formatDistanceToNow(n.createdAt.toDate()) : 'Just now'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); readOne(n.id); }}
                          className="p-1 rounded text-gray-400 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700"
                          title="Mark read"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                        className="p-1 rounded text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700"
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



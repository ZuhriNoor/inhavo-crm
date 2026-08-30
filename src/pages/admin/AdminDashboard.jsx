import { Outlet, NavLink } from 'react-router-dom';
import { Users, Store, GitBranch, FileText, Shield, Building2, FileSpreadsheet } from 'lucide-react';

const TABS = [
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/stores', label: 'Stores', icon: Store },
  { to: '/admin/pipeline', label: 'Pipeline Stages', icon: GitBranch },
  { to: '/admin/docket-templates', label: 'Docket Config', icon: FileText },
  { to: '/admin/warranty-config', label: 'Warranty Config', icon: Shield },
  { to: '/admin/vendors', label: 'Vendors', icon: Building2 },
  { to: '/admin/exports', label: 'Data Exports', icon: FileSpreadsheet },
];

const AdminDashboard = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-slate-900 transition-colors">
      {/* Admin header */}
      <div className="px-4 sm:px-6 pt-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shrink-0 transition-colors">
        <h1 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-3">Admin Panel</h1>
        <nav className="flex gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Sub-page content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminDashboard;

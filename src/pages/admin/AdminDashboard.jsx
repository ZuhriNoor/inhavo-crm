// AdminDashboard — layout for admin sub-pages
import { Outlet, NavLink } from 'react-router-dom';
import { Users, Store, GitBranch } from 'lucide-react';

const TABS = [
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/stores', label: 'Stores', icon: Store },
  { to: '/admin/pipeline', label: 'Pipeline Stages', icon: GitBranch },
];

const AdminDashboard = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Admin header */}
      <div className="px-6 pt-4 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-base font-semibold text-gray-800 mb-3">Admin Panel</h1>
        <nav className="flex gap-1">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
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
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminDashboard;

// Sidebar — Odoo-inspired left navigation panel
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Users,
  Store,
  GitBranch,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { useState } from 'react';

const NAV_ITEMS = [
  { to: '/', label: 'CRM', icon: LayoutDashboard, exact: true },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/quotations', label: 'Quotations', icon: FileText },
];

const ADMIN_ITEMS = [
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/stores', label: 'Stores', icon: Store },
  { to: '/admin/pipeline', label: 'Pipeline', icon: GitBranch },
];

const NavItem = ({ to, label, icon: Icon, exact, onClick }) => (
  <NavLink
    to={to}
    end={exact}
    onClick={onClick}
    className={({ isActive }) =>
      `sidebar-link flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 text-sm font-medium transition-all ${
        isActive
          ? 'bg-white/15 text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`
    }
  >
    <Icon size={18} className="shrink-0" />
    <span>{label}</span>
  </NavLink>
);

const Sidebar = ({ isOpen, onClose }) => {
  const { profile, isAdmin, signOut } = useAuth();
  const { availableStores, activeStore, setActiveStore } = useStore();
  const [storeOpen, setStoreOpen] = useState(false);
  const navigate = useNavigate();

  const handleStoreSelect = (store) => {
    setActiveStore(store);
    setStoreOpen(false);
    if (onClose) onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside
      className={`flex flex-col shrink-0 overflow-hidden fixed inset-y-0 left-0 z-50 md:relative transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
      style={{
        width: 220,
        background: 'linear-gradient(180deg, #2c3e50 0%, #1a252f 100%)',
      }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-center px-5 py-5 mt-2 border-b border-white/10">
        <img src="/logo-inhavo.png" alt="Inhavo CRM" className="h-15 w-35 object-contain" />
      </div>

      {/* Store Switcher */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => setStoreOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 transition-all text-sm"
        >
          <Building2 size={15} className="shrink-0 text-white/50" />
          <span className="flex-1 text-left truncate font-medium">
            {activeStore ? activeStore.name : 'Select store…'}
          </span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-white/40 transition-transform ${storeOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {storeOpen && (
          <div className="mt-1 rounded-lg overflow-hidden bg-white/10 border border-white/10">
            {availableStores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleStoreSelect(store)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  activeStore?.id === store.id
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 my-1 border-t border-white/10" />

        {/* Primary Links */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} onClick={onClose} />
          ))}
        </div>

        {/* Admin Links */}
        {isAdmin && (
          <div className="mt-6">
            <h4 className="px-5 mb-2 text-[11px] font-bold tracking-wider text-white/40 uppercase">
              Admin
            </h4>
            <div className="space-y-1">
              {ADMIN_ITEMS.map((item) => (
                <NavItem key={item.to} {...item} onClick={onClose} />
              ))}
            </div>
          </div>
        )}</nav>

      {/* User footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0"
            style={{ background: '#875a7b' }}
          >
            {profile?.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {profile?.displayName || 'User'}
            </p>
            <p className="text-white/40 text-xs capitalize">{profile?.role || 'user'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-white/40 hover:text-white/80 text-xs transition-colors"
            title="Sign out"
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

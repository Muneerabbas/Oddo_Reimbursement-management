import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Building2,
  ChevronRight,
  LayoutDashboard,
  PlusCircle,
  List,
  CheckSquare,
  SlidersHorizontal,
  Shield,
  UsersRound,
  ScrollText,
  X,
} from 'lucide-react';

const Sidebar = ({ isMobileOpen, setMobileOpen }) => {
  const { role, user } = useAuth();
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
  const isAdmin = normalizedRole === 'admin';
  const isEmployee = normalizedRole === 'employee';
  const isManagerLike = !isAdmin && !isEmployee;

  // Keep admin/employee behavior unchanged. Manager-like roles get logs and no My Expenses nav item.
  const primaryNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    ...(isEmployee ? [{ label: 'Submit Expense', path: '/expenses/new', icon: PlusCircle }] : []),
    ...((isEmployee || isAdmin) ? [{ label: 'My Expenses', path: '/expenses', icon: List, exact: true }] : []),
  ];

  const workflowNavItems = [];

  if (isManagerLike || isAdmin) {
    workflowNavItems.push({ label: 'Approvals', path: '/approvals', icon: CheckSquare, exact: true });
  }

  if (isManagerLike) {
    workflowNavItems.push({ label: 'Logs', path: '/logs', icon: ScrollText, exact: true });
  }

  const adminNavItems = [];

  if (isAdmin) {
    adminNavItems.push({ label: 'Teams', path: '/teams', icon: UsersRound, exact: true });
    adminNavItems.push({ label: 'User Management', path: '/admin/users', icon: Shield, exact: true });
    adminNavItems.push({ label: 'Approval Rules', path: '/admin/approval-rules', icon: SlidersHorizontal, exact: true });
  }

  const handleMobileClose = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  const roleLabel = normalizedRole
    ? `${normalizedRole.charAt(0).toUpperCase()}${normalizedRole.slice(1)}`
    : 'User';

  const renderNavList = (items) => (
    <div className="space-y-1.5">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={!!item.exact}
          onClick={handleMobileClose}
          className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
            isActive
              ? 'border-primary/35 bg-[linear-gradient(120deg,_rgba(219,234,254,0.75)_0%,_rgba(255,255,255,0.92)_100%)] text-slate-900 shadow-sm'
              : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
          }`}
        >
          {({ isActive }) => (
            <>
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`}>
                {React.createElement(item.icon, { size: 16 })}
              </span>
              <span className="flex-1">{item.label}</span>
              <ChevronRight size={16} className={`transition-all ${isActive ? 'translate-x-0 text-primary opacity-100' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
            </>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
          onClick={handleMobileClose}
        />
      )}

      {/* Main Sidebar Panel */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_32%,_#f8fafc_100%)] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Building2 size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Workspace</p>
              <p className="text-base font-bold tracking-tight text-slate-900">Odoo Corporate</p>
            </div>
          </div>

          {/* Mobile close button visible only when mobile menu is open */}
          <button
            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none md:hidden"
            onClick={handleMobileClose}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex h-[calc(100vh-4.5rem)] flex-col">
          {/* Vertical Navigation Links */}
          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
            <section>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Main</p>
              {renderNavList(primaryNavItems)}
            </section>

            {workflowNavItems.length > 0 && (
              <section>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Workflow</p>
                {renderNavList(workflowNavItems)}
              </section>
            )}

            {adminNavItems.length > 0 && (
              <section>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Administration</p>
                {renderNavList(adminNavItems)}
              </section>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

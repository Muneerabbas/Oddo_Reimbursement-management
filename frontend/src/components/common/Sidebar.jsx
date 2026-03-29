import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
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
  const { role } = useAuth();
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
  const isAdmin = normalizedRole === 'admin';
  const isEmployee = normalizedRole === 'employee';
  const isManagerLike = !isAdmin && !isEmployee;

  // Professional active/inactive styling for navigation links
  const baseLinkClasses = "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm";
  const inactiveClasses = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const activeClasses = "bg-primary text-white shadow-sm";

  // Keep admin/employee behavior unchanged. Manager-like roles get logs and no My Expenses nav item.
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    ...(isEmployee ? [{ label: 'Submit Expense', path: '/expenses/new', icon: <PlusCircle size={20} /> }] : []),
    ...((isEmployee || isAdmin) ? [{ label: 'My Expenses', path: '/expenses', icon: <List size={20} /> }] : []),
  ];

  if (isManagerLike || isAdmin) {
    navItems.push({ label: 'Approvals', path: '/approvals', icon: <CheckSquare size={20} /> });
  }

  if (isManagerLike) {
    navItems.push({ label: 'Logs', path: '/logs', icon: <ScrollText size={20} /> });
  }

  if (isAdmin) {
    navItems.push({ label: 'Teams', path: '/teams', icon: <UsersRound size={20} /> });
    navItems.push({ label: 'User Management', path: '/admin/users', icon: <Shield size={20} /> });
    navItems.push({ label: 'Approval Rules', path: '/admin/approval-rules', icon: <SlidersHorizontal size={20} /> });
  }

  const handleMobileClose = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <span className="text-lg font-bold text-slate-800 tracking-tight">Odoo Corporate</span>
          {/* Mobile close button visible only when mobile menu is open */}
          <button 
            className="md:hidden text-slate-500 hover:text-slate-800 focus:outline-none"
            onClick={handleMobileClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* Vertical Navigation Links */}
        <nav className="p-4 flex flex-col gap-2 overflow-y-auto h-[calc(100vh-4rem)]">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleMobileClose}
              end={item.path === '/dashboard' || item.path === '/expenses'}
              className={({ isActive }) => 
                `${baseLinkClasses} ${isActive ? activeClasses : inactiveClasses}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

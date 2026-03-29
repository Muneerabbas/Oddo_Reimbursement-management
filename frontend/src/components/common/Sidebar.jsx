import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  PlusCircle, 
  List, 
  CheckSquare, 
  Shield, 
  X 
} from 'lucide-react';

const Sidebar = ({ isMobileOpen, setMobileOpen }) => {
  const { role } = useAuth(); // Destructure role for conditional rendering

  // Professional active/inactive styling for navigation links
  const baseLinkClasses = "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm";
  const inactiveClasses = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const activeClasses = "bg-primary text-white shadow-sm";

  // Map out standard navigation logic cleanly
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Submit Expense', path: '/expenses/new', icon: <PlusCircle size={20} /> },
    { label: 'My Expenses', path: '/expenses', icon: <List size={20} /> },
    { label: 'Approvals', path: '/approvals', icon: <CheckSquare size={20} /> },
  ];

  // Insert Admin specific panel conditionally
  if (role === 'admin') {
    navItems.push({ label: 'User Management', path: '/admin/users', icon: <Shield size={20} /> });
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
          <span className="text-lg font-bold text-slate-800 tracking-tight">Oddo Corporate</span>
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
              end={item.path === '/dashboard'} // Dashboard root route exact match
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

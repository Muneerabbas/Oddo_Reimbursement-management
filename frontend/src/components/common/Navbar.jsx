import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Menu, LogOut, User } from 'lucide-react';
import notificationService from '../../services/notificationService';
import NotificationBell from './NotificationBell';

const Navbar = ({ toggleMobileMenu }) => {
  const { user, role, displayRole, logout } = useAuth(); // Pull global session context

  const handleLogout = () => {
    logout();
    notificationService.info('You have been logged out.');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-4 sm:px-6 relative z-10 w-full">
      
      {/* Left side: Mobile Hamburger Toggle */}
      <div className="flex items-center">
        <button 
          className="md:hidden text-slate-600 hover:text-slate-900 focus:outline-none p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={toggleMobileMenu}
          aria-label="Toggle Menu"
        >
          <Menu size={24} />
        </button>
        <span className="md:hidden ml-2 font-semibold text-slate-800">
           Portal
        </span>
      </div>

      {/* Right side: User Profile, Role Badge, Logout */}
      <div className="flex items-center gap-4 sm:gap-6 ml-auto">
        
        {/* Role Badge - Hidden on very small screens for cleanliness */}
        {displayRole && (
          <span className="hidden sm:inline-block px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-full uppercase tracking-wide">
            {displayRole}
          </span>
        )}

        <NotificationBell userId={user?.id} role={role} />

        {/* User Identity Segment */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 sm:pl-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-500 overflow-hidden shadow-inner">
               {/* Could swap with an img `src={user.avatar}` realistically */}
               <User size={18} />
            </div>
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold text-slate-800">
                {user?.name || 'Reimbursement User'}
              </span>
              <span className="text-xs text-slate-500 truncate max-w-[120px]">
                {user?.email || 'user@company.com'}
              </span>
            </div>
          </div>

          {/* Secure Logout Action */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-2"
            title="Log Out Protocol"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
};

export default Navbar;

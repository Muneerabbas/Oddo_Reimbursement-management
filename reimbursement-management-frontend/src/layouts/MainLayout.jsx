import React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* 
        Placeholder for Sidebar Navigation Component
        <Sidebar />
      */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 hidden md:block">
        <div className="p-4 border-b border-slate-200 text-center font-bold text-slate-800">
          Reimbursement Manager
        </div>
        <nav className="p-4 flex flex-col gap-2">
          {/* Dashboard, Expenses, Approvals, Admin Links */}
          <div className="text-sm text-slate-500 italic p-2 rounded hover:bg-slate-50">Sidebar Navigation Area</div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/*
          Placeholder for Top Navigation/Header
          <Header />
        */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="font-semibold text-slate-600 block md:hidden">RM App</div>
          <div className="ml-auto flex items-center gap-4">
             {/* User Profile / Notifications */}
             <div className="text-sm text-slate-500">Header Profile Area</div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
          {/* Nested routes will render here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

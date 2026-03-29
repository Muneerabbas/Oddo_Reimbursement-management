import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      {/* 
        This is a placeholder layout for Auth pages like Login, Register, Forgot Password.
        Components nested inside the route will render at <Outlet />.
      */}
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-lg border border-slate-100">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Reimbursement App</h1>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;

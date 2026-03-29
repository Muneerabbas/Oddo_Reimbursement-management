import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      {/* 
        This is a placeholder layout for Auth pages like Login, Register, Forgot Password.
        Components nested inside the route will render at <Outlet />.
      */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Reimbursement App</h1>
          <p className="mt-1 text-sm text-slate-500">Secure enterprise expense operations</p>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;

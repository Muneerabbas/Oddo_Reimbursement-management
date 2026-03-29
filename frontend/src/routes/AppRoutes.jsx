import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';

import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import DashboardHome from '../pages/dashboard/DashboardHome';
import MyExpenses from '../pages/expenses/MyExpenses';
import SubmitExpense from '../pages/expenses/SubmitExpense';
import Approvals from '../pages/approvals/Approvals';
import Users from '../pages/admin/Users';
import ApprovalRules from '../pages/admin/ApprovalRules';

const AppRoutes = () => {
  return (
    <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50">
           <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
    }>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth" element={<AuthLayout />}>
           <Route path="login" element={<Login />} />
           <Route path="signup" element={<Signup />} />
        </Route>

        {/* Protected Routes inside Main Layout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            {/* Redirect / to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />
            
            <Route path="expenses" element={<MyExpenses />} />
            <Route path="expenses/new" element={<SubmitExpense />} />

            {/* Approvals route accessible by specific roles (e.g. manager) */}
            <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
              <Route path="approvals" element={<Approvals />} />
            </Route>
            
            {/* Admin only routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="admin/users" element={<Users />} />
              <Route path="admin/approval-rules" element={<ApprovalRules />} />
            </Route>
          </Route>
        </Route>

        {/* Global Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

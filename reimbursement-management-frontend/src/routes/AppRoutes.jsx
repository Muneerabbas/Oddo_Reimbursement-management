import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';

import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';

// In a real application, you would lazy load the page components here.
// Example:
// const DashboardHome = lazy(() => import('../pages/dashboard/Dashboard'));
// const ExpensesList = lazy(() => import('../pages/expenses/ExpenseList'));

// For now, these are placeholder components to demonstrate routing.
const PlaceholderComponent = ({ title }) => (
  <div className="bg-white shadow rounded-lg p-6">
    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
    <p className="mt-4 text-slate-600">This page logic belongs in the pages folder.</p>
  </div>
);

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
          <Route path="/" element={<MainLayout />}>
            {/* Redirect / to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<PlaceholderComponent title="Dashboard Core" />} />
            
            <Route path="expenses" element={<PlaceholderComponent title="Expense Management" />} />
            <Route path="expenses/new" element={<PlaceholderComponent title="Create Expense Request" />} />

            {/* Approvals route accessible by specific roles (e.g. manager) */}
            <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
              <Route path="approvals" element={<PlaceholderComponent title="Expense Approvals" />} />
            </Route>
            
            {/* Admin only routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="admin" element={<PlaceholderComponent title="System Administration" />} />
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

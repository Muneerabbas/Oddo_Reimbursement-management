import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ApprovalRules from '../pages/admin/ApprovalRules';
import Users from '../pages/admin/Users';
import Approvals from '../pages/approvals/Approvals';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import RoleBasedDashboard from '../pages/dashboard/RoleBasedDashboard';
import MyExpenses from '../pages/expenses/MyExpenses';
import ScanReceipt from '../pages/expenses/ScanReceipt';
import SubmitExpense from '../pages/expenses/SubmitExpense';
import ManagerLogs from '../pages/logs/ManagerLogs';
import Landing from '../pages/public/Landing';
import Unauthorized from '../pages/system/Unauthorized';
import Teams from '../pages/teams/Teams';
import ProtectedRoute from './ProtectedRoute';

const AppRoutes = () => {
  return (
    <Suspense
      fallback={(
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
        </Route>
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route path="dashboard" element={<RoleBasedDashboard />} />

            <Route path="expenses" element={<MyExpenses />} />
            <Route path="expenses/new" element={<SubmitExpense />} />
            <Route path="expenses/scan" element={<ScanReceipt />} />

            <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
              <Route path="approvals" element={<Approvals />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
              <Route path="logs" element={<ManagerLogs />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="teams" element={<Teams />} />
              <Route path="admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="admin/users" element={<Users />} />
              <Route path="admin/approval-rules" element={<ApprovalRules />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

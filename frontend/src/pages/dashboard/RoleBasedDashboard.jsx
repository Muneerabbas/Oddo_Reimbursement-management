import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import DashboardHome from './DashboardHome';
import EmployeeDashboard from './EmployeeDashboard';

const RoleBasedDashboard = () => {
  const { user } = useAuth();
  const normalizedRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';

  if (normalizedRole === 'admin' || normalizedRole === 'manager') {
    return <DashboardHome />;
  }

  // Default every non-admin/manager user to the employee dashboard.
  return <EmployeeDashboard />;
};

export default RoleBasedDashboard;

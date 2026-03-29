import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import DashboardHome from './DashboardHome';
import EmployeeDashboard from './EmployeeDashboard';

const RoleBasedDashboard = () => {
  const { user } = useAuth();
  const normalizedRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';

  if (normalizedRole === 'employee') {
    return <EmployeeDashboard />;
  }

  return <DashboardHome />;
};

export default RoleBasedDashboard;

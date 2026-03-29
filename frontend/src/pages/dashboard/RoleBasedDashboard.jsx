import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import DashboardHome from './DashboardHome';
import EmployeeDashboard from './EmployeeDashboard';

const RoleBasedDashboard = () => {
  const { user } = useAuth();
  const normalizedRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';
  const isEmployee = normalizedRole === 'employee';

  if (isEmployee) {
    return <EmployeeDashboard />;
  }

  // Admin + all non-employee roles (manager, director, etc.) share manager dashboard behavior.
  return <DashboardHome />;
};

export default RoleBasedDashboard;

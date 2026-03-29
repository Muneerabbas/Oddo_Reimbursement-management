import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, FileText, XCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/feedback/EmptyState';
import { StatCardsSkeleton } from '../../components/feedback/Skeleton';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import dashboardService from '../../services/dashboardService';

const DashboardHome = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let internalCancel = false;

    const fetchDashboardAnalytics = async () => {
      try {
        const data = await dashboardService.getDashboardStats();
        if (!internalCancel) {
          setStats(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!internalCancel) {
          console.error('Dashboard Stats Failed:', err);
          setError('Failed to load dashboard metrics. Please try refreshing.');
          setIsLoading(false);
        }
      }
    };

    fetchDashboardAnalytics();

    return () => {
      internalCancel = true;
    };
  }, []);

  const companyDescription = user?.company?.about;
  const companyMeta = user?.company?.name
    ? `${user.company.name}${user.company.defaultCurrency ? ` · Base currency ${user.company.defaultCurrency}` : ''}`
    : null;

  if (isLoading) {
    return (
      <div className="page-stack">
        <PageHeader
          title={`Welcome back, ${user?.name ? user.name.split(' ')[0] : 'User'}`}
          description="Here's what's happening with your expenses today."
        />
        <StatCardsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Dashboard"
        description={error}
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={`Welcome back, ${user?.name ? user.name.split(' ')[0] : 'User'}`}
        description="Here's what's happening with your expenses today."
      />

      {(companyMeta || companyDescription) && (
        <div className="panel-card-muted p-4">
          {companyMeta && <p className="text-sm font-medium text-slate-700">{companyMeta}</p>}
          {companyDescription && <p className="mt-1 text-sm text-slate-500">{companyDescription}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <StatCard
          title="Total Submitted"
          value={stats.totalSubmitted}
          valueColorClass="text-slate-900"
          icon={<FileText size={24} className="text-slate-500" />}
          description="Lifetime expenses"
        />

        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          valueColorClass="text-amber-600"
          icon={<Clock size={24} className="text-amber-500" />}
          description="Awaiting review"
        />

        <StatCard
          title="Approved Amount"
          value={`$${stats.approvedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          valueColorClass="text-emerald-600"
          icon={<CheckCircle size={24} className="text-emerald-500" />}
          trend={{ isUp: true, value: '12%' }}
          description="Since last month"
        />

        <StatCard
          title="Rejected Count"
          value={stats.rejectedCount}
          valueColorClass="text-red-600"
          icon={<XCircle size={24} className="text-red-500" />}
          description="Requires attention"
        />
      </div>

      <section className="mt-6">
        <div className="panel-card flex h-64 flex-col items-center justify-center text-slate-400">
          <FileText size={48} className="mb-4 text-slate-300 opacity-50" />
          <p className="text-lg font-medium text-slate-500">Recent Activity Area</p>
          <p className="text-sm">A data table can be placed here in the future.</p>
        </div>
      </section>
    </div>
  );
};

export default DashboardHome;

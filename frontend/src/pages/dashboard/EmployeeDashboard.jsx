import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/feedback/EmptyState';
import { StatCardsSkeleton } from '../../components/feedback/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import ExpenseTable from '../../components/ui/ExpenseTable';
import dashboardService from '../../services/dashboardService';

const formatCurrencyValue = (amount, currency = 'USD') => {
  const numeric = typeof amount === 'number' ? amount : Number(amount || 0);

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `$${numeric.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
};

const EmployeeDashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await dashboardService.getDashboardStats();

        if (!cancelled) {
          setStats(response);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Employee dashboard fetch failed:', err);
          setError('Unable to load your dashboard right now. Please refresh and try again.');
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = useMemo(() => user?.name?.split(' ')?.[0] || 'there', [user?.name]);
  const userCurrency = user?.company?.defaultCurrency || 'USD';
  const recentActivity = stats?.recentActivity || [];
  const pendingExpenses = recentActivity.filter((item) => item.status === 'Pending');

  if (isLoading) {
    return (
      <div className="page-stack">
        <PageHeader
          title={`Welcome, ${firstName}`}
          description="Loading your employee dashboard..."
        />
        <StatCardsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Dashboard Temporarily Unavailable"
        description={error}
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Track your reimbursements, upload receipts, and submit new expenses quickly."
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/expenses/scan"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Upload size={16} />
              Scan Receipt
            </Link>
            <Link
              to="/expenses/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark"
            >
              <Plus size={16} />
              New Expense
            </Link>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <StatCard
          title="Submitted"
          value={stats.totalSubmitted ?? 0}
          icon={<FileText size={22} className="text-slate-500" />}
          description="Lifetime requests"
        />

        <StatCard
          title="Pending"
          value={stats.pendingApprovals ?? 0}
          valueColorClass="text-amber-600"
          icon={<Clock3 size={22} className="text-amber-500" />}
          description="Waiting on approval"
        />

        <StatCard
          title="Approved Value"
          value={formatCurrencyValue(stats.approvedAmount || 0, userCurrency)}
          valueColorClass="text-emerald-600"
          icon={<Wallet size={22} className="text-emerald-500" />}
          description={`Base currency: ${userCurrency}`}
        />

        <StatCard
          title="Rejected"
          value={stats.rejectedCount ?? 0}
          valueColorClass="text-red-600"
          icon={<XCircle size={22} className="text-red-500" />}
          description="Requires resubmission"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Recent Reimbursements</h2>
          <ExpenseTable
            data={recentActivity}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowClick={() => {}}
            onViewDocument={() => {}}
          />
        </section>

        <aside className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Action Required</h2>
          <div className="panel-card space-y-3 p-4">
            {pendingExpenses.length > 0 ? (
              pendingExpenses.slice(0, 4).map((expense) => (
                <div key={expense.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-amber-900">{expense.id}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-700">
                      <Clock3 size={12} />
                      Pending
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-amber-800">{expense.description}</p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  No pending expense actions.
                </p>
                <p className="mt-1">You are fully up to date.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

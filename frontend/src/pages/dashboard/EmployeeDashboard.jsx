import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Upload,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/feedback/EmptyState';
import { StatCardsSkeleton } from '../../components/feedback/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import ExpenseTable from '../../components/ui/ExpenseTable';
import dashboardService from '../../services/dashboardService';

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const getExpenseAmount = (expense) => {
  const numeric = Number(expense?.amount ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

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
  const navigate = useNavigate();

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
  const recentActivity = useMemo(() => stats?.recentActivity || [], [stats?.recentActivity]);

  const summary = useMemo(() => {
    const hasActivity = recentActivity.length > 0;
    const pendingClaims = [];
    const approvedClaims = [];
    const rejectedClaims = [];
    const categoryTotals = new Map();

    for (const expense of recentActivity) {
      const normalized = normalizeStatus(expense.status);
      const amount = getExpenseAmount(expense);

      if (normalized === 'approved') {
        approvedClaims.push(expense);
      } else if (normalized === 'rejected') {
        rejectedClaims.push(expense);
      } else {
        pendingClaims.push(expense);
      }

      const category = expense.category || 'Other';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
    }

    const reimbursedAmount = hasActivity
      ? approvedClaims.reduce((sum, item) => sum + getExpenseAmount(item), 0)
      : Number(stats?.approvedAmount || 0);
    const reimbursementDue = pendingClaims.reduce((sum, item) => sum + getExpenseAmount(item), 0);
    const totalTrackedValue = [...categoryTotals.values()].reduce((sum, value) => sum + value, 0);

    const topCategories = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalTrackedValue > 0 ? Math.round((value / totalTrackedValue) * 100) : 0,
      }));

    return {
      totalClaims: hasActivity ? recentActivity.length : (stats?.totalSubmitted ?? 0),
      pendingCount: hasActivity ? pendingClaims.length : (stats?.pendingApprovals ?? 0),
      rejectedCount: hasActivity ? rejectedClaims.length : (stats?.rejectedCount ?? 0),
      reimbursedAmount,
      reimbursementDue,
      pendingPreview: pendingClaims.slice(0, 4),
      topCategories,
    };
  }, [recentActivity, stats]);

  const openExpenses = () => navigate('/expenses');

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
        description="Track your personal claims, submit receipts, and follow reimbursement progress."
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
          title="My Claims"
          value={summary.totalClaims}
          icon={<FileText size={22} className="text-slate-500" />}
          description="Submitted by you"
        />

        <StatCard
          title="Awaiting Approval"
          value={summary.pendingCount}
          valueColorClass="text-amber-600"
          icon={<Clock3 size={22} className="text-amber-500" />}
          description="In review"
        />

        <StatCard
          title="Reimbursed"
          value={formatCurrencyValue(summary.reimbursedAmount, userCurrency)}
          valueColorClass="text-emerald-600"
          icon={<CheckCircle2 size={22} className="text-emerald-500" />}
          description="Approved payouts"
        />

        <StatCard
          title="To Be Reimbursed"
          value={formatCurrencyValue(summary.reimbursementDue, userCurrency)}
          valueColorClass="text-blue-600"
          icon={<Wallet size={22} className="text-blue-500" />}
          description="Still pending"
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
            onRowClick={openExpenses}
            onViewDocument={openExpenses}
          />
        </section>

        <aside className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Employee Actions</h2>

          <div className="panel-card space-y-3 p-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-semibold">Awaiting approval: {summary.pendingCount}</p>
              <p className="mt-1 text-amber-700">Track these in your expense history.</p>
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              <p className="flex items-center gap-1 font-semibold">
                <AlertTriangle size={15} />
                Needs update: {summary.rejectedCount}
              </p>
              <p className="mt-1 text-rose-700">Rejected claims can be corrected and resubmitted.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Link to="/expenses" className="text-sm font-medium text-primary hover:underline">
                Review my claims
              </Link>
              <Link to="/expenses/new" className="text-sm font-medium text-primary hover:underline">
                Submit a new claim
              </Link>
            </div>

            {summary.pendingPreview.length > 0 && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                {summary.pendingPreview.map((expense) => (
                  <div key={expense.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{expense.id}</span>
                      <span className="text-xs font-medium text-amber-700">Pending</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{expense.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-card space-y-3 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Top Categories</h3>
            {summary.topCategories.length > 0 ? (
              summary.topCategories.map((item) => (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.name}</span>
                    <span className="text-slate-600">{formatCurrencyValue(item.value, userCurrency)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No category data available yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

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
import expenseService from '../../services/expenseService';
import notificationService from '../../services/notificationService';

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const formatCurrencyValue = (amount, currency = 'USD') => {
  const numeric = Number(amount ?? 0);
  const safeAmount = Number.isFinite(numeric) ? numeric : 0;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `$${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 6;

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
  const categoryBreakdown = useMemo(() => stats?.categoryBreakdown || [], [stats?.categoryBreakdown]);
  const insights = stats?.insights || {};
  const totalCategorySpend = categoryBreakdown.reduce((sum, item) => sum + item.value, 0);

  const pendingPreview = useMemo(
    () => recentActivity.filter((expense) => normalizeStatus(expense.status) === 'pending').slice(0, 4),
    [recentActivity],
  );

  const monthDeltaPercent = insights.monthOverMonthDeltaPercent;
  const monthDeltaLabel = monthDeltaPercent == null
    ? 'No month-over-month baseline yet'
    : `${monthDeltaPercent > 0 ? '+' : ''}${monthDeltaPercent}% vs last month`;

  const handleViewDocument = async (expense) => {
    try {
      await expenseService.viewExpenseDocument(expense.id);
    } catch (err) {
      console.error(err);
      notificationService.error(err.message || 'Unable to open the document.');
    }
  };

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
        description="Track claims, submit new receipts, and stay on top of reimbursement status."
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/expenses/scan"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Upload size={16} />
              Scan Receipt
            </Link>
            <Link
              to="/expenses/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
            >
              <Plus size={16} />
              New Expense
            </Link>
          </div>
        )}
      />

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(120deg,_#ecfeff_0%,_#f8fcff_45%,_#ffffff_100%)] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-100/80" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-emerald-100/70" />
        <div className="relative">
          <p className="inline-flex rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-800">
            Personal Snapshot
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {formatCurrencyValue(insights.currentMonthAmount, userCurrency)} claimed this month
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-700">{monthDeltaLabel}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              Avg claim {formatCurrencyValue(insights.averageClaimAmount, userCurrency)}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              Last sync {stats.lastUpdatedAt ? new Date(stats.lastUpdatedAt).toLocaleTimeString() : 'just now'}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <StatCard
          title="My Claims"
          value={stats.totalSubmitted}
          icon={<FileText size={22} className="text-slate-500" />}
          description="Submitted by you"
        />
        <StatCard
          title="Awaiting Approval"
          value={stats.pendingApprovals}
          valueColorClass="text-amber-700"
          icon={<Clock3 size={22} className="text-amber-500" />}
          description="In review"
        />
        <StatCard
          title="Reimbursed"
          value={formatCurrencyValue(stats.approvedAmount, userCurrency)}
          valueColorClass="text-emerald-700"
          icon={<CheckCircle2 size={22} className="text-emerald-500" />}
          description="Approved payouts"
        />
        <StatCard
          title="To Be Reimbursed"
          value={formatCurrencyValue(insights.pendingAmount, userCurrency)}
          valueColorClass="text-blue-700"
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
            onRowClick={() => navigate('/expenses')}
            onViewDocument={handleViewDocument}
          />
        </section>

        <aside className="space-y-4">
          <div className="panel-card space-y-3 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Action Center</h2>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-semibold">Awaiting approval: {stats.pendingApprovals}</p>
              <p className="mt-1 text-amber-700">Track these in your expense history.</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              <p className="flex items-center gap-1 font-semibold">
                <AlertTriangle size={15} />
                Needs update: {stats.rejectedCount}
              </p>
              <p className="mt-1 text-rose-700">Rejected claims can be corrected and resubmitted.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link to="/expenses" className="text-sm font-semibold text-primary hover:underline">
                Review my claims
              </Link>
              <Link to="/expenses/new" className="text-sm font-semibold text-primary hover:underline">
                Submit a new claim
              </Link>
            </div>

            {pendingPreview.length > 0 && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                {pendingPreview.map((expense) => (
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
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Top Categories</h3>
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.slice(0, 4).map((item) => {
                const percentage = totalCategorySpend > 0
                  ? Math.round((item.value / totalCategorySpend) * 100)
                  : 0;
                return (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.name}</span>
                      <span className="text-slate-600">{formatCurrencyValue(item.value, userCurrency)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
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

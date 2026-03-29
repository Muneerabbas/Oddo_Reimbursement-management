import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CurrencyContext } from '../../contexts/CurrencyContext';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutList,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/feedback/EmptyState';
import { StatCardsSkeleton } from '../../components/feedback/Skeleton';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import ExpenseTable from '../../components/ui/ExpenseTable';
import dashboardService from '../../services/dashboardService';
import expenseService from '../../services/expenseService';
import notificationService from '../../services/notificationService';


const DashboardHome = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { selectedCurrency, formatAmount } = useContext(CurrencyContext);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 6;

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      try {
        const data = await dashboardService.getDashboardStats();
        if (!cancelled) {
          setStats(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Dashboard stats failed:', err);
          setError('Failed to load dashboard metrics. Please refresh and try again.');
          setIsLoading(false);
        }
      }
    };

    fetchDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
  const isAdmin = normalizedRole === 'admin';
  const isEmployee = normalizedRole === 'employee';
  const isManagerLike = !isAdmin && !isEmployee;
  const firstName = user?.name?.split(' ')?.[0] || 'there';
  const historyPath = isManagerLike ? '/logs' : '/expenses';
  const dataCurrency = user?.company?.defaultCurrency || 'USD';

  const insights = stats?.insights || {};
  const categoryBreakdown = stats?.categoryBreakdown || [];
  const totalCategorySpend = categoryBreakdown.reduce((sum, item) => sum + item.value, 0);
  const monthDeltaPercent = insights.monthOverMonthDeltaPercent;
  const monthDeltaLabel = monthDeltaPercent == null
    ? 'No previous month baseline yet'
    : `${monthDeltaPercent > 0 ? '+' : ''}${monthDeltaPercent}% vs last month`;
  const monthDeltaTone = monthDeltaPercent == null
    ? 'text-slate-600'
    : monthDeltaPercent > 0
      ? 'text-rose-700'
      : 'text-emerald-700';
  const topCategory = categoryBreakdown[0] || null;

  const quickStats = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'Claims',
        value: stats.totalSubmitted,
      },
      {
        label: 'Pending',
        value: stats.pendingApprovals,
      },
      {
        label: 'Rejected',
        value: stats.rejectedCount,
      },
      {
        label: 'Approved Value',
        value: formatAmount(stats.approvedAmount, dataCurrency),
      },
    ];
  }, [dataCurrency, stats, formatAmount]);

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
          title={`Welcome back, ${firstName}`}
          description="Loading your workspace insights..."
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
        title={`Welcome back, ${firstName}`}
        description="Live analytics generated from your latest expense records."
      />

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(120deg,_#e0ecff_0%,_#f8fbff_45%,_#ffffff_100%)] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary/10" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-36 w-36 rounded-full bg-emerald-100/60" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="inline-flex items-center rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Live Dashboard
            </p>
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-slate-900">
              Spend this month: {formatAmount(insights.currentMonthAmount, dataCurrency)}
            </h2>
            <p className={`text-sm font-semibold ${monthDeltaTone}`}>{monthDeltaLabel}</p>
            {topCategory && (
              <p className="text-sm text-slate-600">
                Top category: <span className="font-semibold text-slate-800">{topCategory.name}</span> ({formatAmount(topCategory.value, dataCurrency)})
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickStats.map((item) => (
              <div key={item.label} className="rounded-xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <Link
            to={historyPath}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            <LayoutList size={16} />
            View Full History
          </Link>
          <Link
            to="/approvals"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Users size={16} />
            Review Approvals
          </Link>
          {isAdmin && (
            <Link
              to="/teams"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Manage Teams
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-6">
        <StatCard
          title="Total Submitted"
          value={stats.totalSubmitted}
          valueColorClass="text-slate-900"
          icon={<FileText size={22} className="text-slate-500" />}
          description="Claims captured"
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingApprovals}
          valueColorClass="text-amber-700"
          icon={<Clock3 size={22} className="text-amber-500" />}
          description="Awaiting decision"
        />
        <StatCard
          title="Approved Amount"
          value={formatAmount(stats.approvedAmount, dataCurrency)}
          valueColorClass="text-emerald-700"
          icon={<CheckCircle2 size={22} className="text-emerald-500" />}
          description="Approved or paid"
        />
        <StatCard
          title="Rejected"
          value={stats.rejectedCount}
          valueColorClass="text-rose-700"
          icon={<TriangleAlert size={22} className="text-rose-500" />}
          description="Needs correction"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h3 className="mb-3 text-lg font-semibold text-slate-800">Recent Activity</h3>
          <ExpenseTable
            data={stats.recentActivity || []}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowClick={() => navigate(historyPath)}
            onViewDocument={handleViewDocument}
          />
        </section>

        <aside className="space-y-4">
          <div className="panel-card space-y-4 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">Category Breakdown</h3>
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((category) => {
                const percentage = totalCategorySpend > 0
                  ? Math.round((category.value / totalCategorySpend) * 100)
                  : 0;
                return (
                  <div key={category.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{category.name}</span>
                      <span className="font-semibold text-slate-900">
                        {formatAmount(category.value, dataCurrency)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${category.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{percentage}% of tracked spend</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No category data available yet.</p>
            )}
          </div>

          <div className="panel-card space-y-3 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">Insights</h3>
            <p className="text-sm text-slate-600">
              Average claim: <span className="font-semibold text-slate-900">{formatAmount(insights.averageClaimAmount, dataCurrency)}</span>
            </p>
            <p className="text-sm text-slate-600">
              Total tracked spend: <span className="font-semibold text-slate-900">{formatAmount(insights.totalAmount, dataCurrency)}</span>
            </p>
            <p className="text-xs text-slate-500">
              Updated {stats.lastUpdatedAt ? new Date(stats.lastUpdatedAt).toLocaleString() : 'just now'}
            </p>
          </div>
        </aside>
      </div>

    </div>
  );
};

export default DashboardHome;

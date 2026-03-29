import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  Plus,
  ReceiptText,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
} from 'lucide-react';
import expenseService from '../../services/expenseService';
import ExpenseTable from '../../components/ui/ExpenseTable';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/feedback/EmptyState';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import StatCard from '../../components/ui/StatCard';
import notificationService from '../../services/notificationService';

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const titleCaseStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return 'Pending';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getExpenseAmount = (expense) => {
  const parsed = Number(expense?.amount ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
    return `$${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`;
  }
};

const MyExpenses = () => {
  const navigate = useNavigate();
  const [rawExpenses, setRawExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(8);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'All',
    category: 'All',
  });
  const [sortBy, setSortBy] = useState('latest');
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    let unmounted = false;

    const fetchData = async () => {
      try {
        const data = await expenseService.getExpenses();
        if (!unmounted) {
          setRawExpenses(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!unmounted) {
          console.error(err);
          setError('Failed to securely fetch expense history.');
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      unmounted = true;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const options = [...new Set(rawExpenses.map((expense) => expense.category).filter(Boolean))];
    return ['All', ...options.sort((a, b) => a.localeCompare(b))];
  }, [rawExpenses]);

  const statusOptions = useMemo(() => {
    const options = [...new Set(rawExpenses.map((expense) => titleCaseStatus(expense.status)))];
    return ['All', ...options.sort((a, b) => a.localeCompare(b))];
  }, [rawExpenses]);

  const summary = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    rawExpenses.forEach((expense) => {
      const status = normalizeStatus(expense.status);
      if (status === 'approved' || status === 'paid') {
        approved += 1;
      } else if (status === 'rejected') {
        rejected += 1;
      } else {
        pending += 1;
      }
    });

    return {
      total: rawExpenses.length,
      pending,
      approved,
      rejected,
    };
  }, [rawExpenses]);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = rawExpenses.filter((expense) => {
      const statusMatch = filters.status === 'All'
        || normalizeStatus(expense.status) === normalizeStatus(filters.status);
      const categoryMatch = filters.category === 'All' || expense.category === filters.category;

      if (!query) {
        return statusMatch && categoryMatch;
      }

      const searchable = [
        expense.id,
        expense.description,
        expense.category,
        expense.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return statusMatch && categoryMatch && searchable.includes(query);
    });

    const sorted = [...filtered];
    if (sortBy === 'highest') {
      sorted.sort((a, b) => getExpenseAmount(b) - getExpenseAmount(a));
    } else if (sortBy === 'lowest') {
      sorted.sort((a, b) => getExpenseAmount(a) - getExpenseAmount(b));
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return sorted;
  }, [rawExpenses, searchQuery, filters, sortBy]);

  const activeCurrency = useMemo(() => filteredData.find((expense) => expense.currency)?.currency || 'USD', [filteredData]);
  const visibleAmount = useMemo(
    () => filteredData.reduce((sum, expense) => sum + getExpenseAmount(expense), 0),
    [filteredData],
  );

  useEffect(() => {
    if (selectedExpense) {
      document.body.style.overflow = 'hidden';
      return;
    }
    document.body.style.overflow = 'auto';
  }, [selectedExpense]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilters({ status: 'All', category: 'All' });
    setSortBy('latest');
    setCurrentPage(1);
  };

  const handleViewDocument = async (expense) => {
    try {
      await expenseService.viewExpenseDocument(expense.id);
    } catch (err) {
      console.error(err);
      notificationService.error(err.message || 'Unable to open the uploaded document.');
    }
  };

  const handleExportCsv = () => {
    try {
      expenseService.exportExpensesCsv(filteredData);
    } catch (err) {
      console.error(err);
      notificationService.error(err.message || 'Unable to export expenses.');
    }
  };

  return (
    <div className="page-stack relative">
      <PageHeader
        title="Your Expenses"
        description="Track all submitted claims with live filtering, sorting, and quick drill-down."
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isLoading || filteredData.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={18} />
              Export CSV
            </button>

            <Link
              to="/expenses/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
            >
              <Plus size={18} />
              Report Expense
            </Link>
          </div>
        )}
      />

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(120deg,_#eef2ff_0%,_#f8fbff_45%,_#ffffff_100%)] p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-100/80" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-20 w-20 rounded-full bg-cyan-100/70" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Live Expense View</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
            Showing {filteredData.length} of {rawExpenses.length} expenses
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Visible amount: <span className="font-semibold text-slate-800">{formatCurrencyValue(visibleAmount, activeCurrency)}</span>
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Claims"
          value={summary.total}
          icon={<ReceiptText size={20} className="text-slate-500" />}
          description="All submissions"
        />
        <StatCard
          title="Pending"
          value={summary.pending}
          valueColorClass="text-amber-700"
          icon={<Clock3 size={20} className="text-amber-500" />}
          description="Awaiting review"
        />
        <StatCard
          title="Approved / Paid"
          value={summary.approved}
          valueColorClass="text-emerald-700"
          icon={<CheckCircle2 size={20} className="text-emerald-500" />}
          description="Cleared claims"
        />
        <StatCard
          title="Rejected"
          value={summary.rejected}
          valueColorClass="text-rose-700"
          icon={<XCircle size={20} className="text-rose-500" />}
          description="Needs updates"
        />
      </div>

      <div className="panel-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by ID, description, category, or status..."
            value={searchQuery}
            onChange={(event) => {
              setCurrentPage(1);
              setSearchQuery(event.target.value);
            }}
            disabled={isLoading}
            className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50"
          />
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <div className="relative min-w-[145px]">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'All' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[165px]">
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category === 'All' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[155px]">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={sortBy}
              onChange={(event) => {
                setCurrentPage(1);
                setSortBy(event.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="latest">Sort: Latest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="highest">Sort: Highest Amount</option>
              <option value="lowest">Sort: Lowest Amount</option>
            </select>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : error ? (
        <EmptyState
          title="Unable to Load Expenses"
          description={error}
        />
      ) : filteredData.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No Expense Records"
          description="No expenses matched your current filters. Adjust filters or submit a new claim."
          actionLabel="Create Expense"
          onAction={() => navigate('/expenses/new')}
        />
      ) : (
        <ExpenseTable
          data={filteredData}
          onRowClick={(expense) => setSelectedExpense(expense)}
          onViewDocument={handleViewDocument}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
        />
      )}

      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <h3 className="text-xl font-semibold tracking-tight text-slate-800">
                Expense Breakdown
              </h3>
              <button
                onClick={() => setSelectedExpense(null)}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Transaction ID</p>
                  <p className="text-sm font-medium text-primary">{selectedExpense.id}</p>
                </div>
                <StatusBadge status={selectedExpense.status} />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                <div className="col-span-2 sm:col-span-1">
                  <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Submission Date</p>
                  <p className="font-medium text-slate-900">{new Date(selectedExpense.date).toLocaleDateString()}</p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Category</p>
                  <p className="font-medium text-slate-900">{selectedExpense.category}</p>
                </div>

                <div className="col-span-2">
                  <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Amount</p>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    {formatCurrencyValue(selectedExpense.amount, selectedExpense.currency)}
                  </p>
                </div>

                <div className="col-span-2 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Description</p>
                  <p className="text-sm leading-relaxed text-slate-700">{selectedExpense.description}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => handleViewDocument(selectedExpense)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                View Document
              </button>
              <button
                onClick={() => setSelectedExpense(null)}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyExpenses;

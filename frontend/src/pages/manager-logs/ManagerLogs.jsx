import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Search, XCircle } from 'lucide-react';
import EmptyState from '../../components/feedback/EmptyState';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import ExpenseTable from '../../components/ui/ExpenseTable';
import StatCard from '../../components/ui/StatCard';
import expenseService from '../../services/expenseService';
import notificationService from '../../services/notificationService';

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const ManagerLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  useEffect(() => {
    let cancelled = false;

    const loadLogs = async () => {
      try {
        const response = await expenseService.getExpenses();
        if (!cancelled) {
          setLogs(response || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load manager logs:', err);
          setError('Unable to load logs right now.');
          setIsLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusSummary = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    for (const item of logs) {
      const status = normalizeStatus(item.status);
      if (status === 'approved') {
        approved += 1;
      } else if (status === 'rejected') {
        rejected += 1;
      } else if (status === 'pending') {
        pending += 1;
      }
    }

    return { pending, approved, rejected };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return logs.filter((item) => {
      const status = normalizeStatus(item.status);
      const statusMatch = statusFilter === 'All' || status === statusFilter.toLowerCase();
      const queryMatch = query.length === 0
        || item.id?.toLowerCase().includes(query)
        || item.description?.toLowerCase().includes(query)
        || item.category?.toLowerCase().includes(query);

      return statusMatch && queryMatch;
    });
  }, [logs, searchQuery, statusFilter]);

  const handleViewDocument = async (expense) => {
    try {
      await expenseService.viewExpenseDocument(expense.id);
    } catch (err) {
      console.error(err);
      notificationService.error(err.message || 'Unable to open the uploaded document.');
    }
  };

  if (isLoading) {
    return (
      <div className="page-stack">
        <PageHeader
          title="Manager Logs"
          description="Loading pending, approved, and rejected requests..."
        />
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to Load Logs"
        description={error}
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Manager Logs"
        description="Track all requests by status: pending, approved, and rejected."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Pending"
          value={statusSummary.pending}
          valueColorClass="text-amber-600"
          icon={<Clock3 size={20} className="text-amber-500" />}
        />
        <StatCard
          title="Approved"
          value={statusSummary.approved}
          valueColorClass="text-emerald-600"
          icon={<CheckCircle2 size={20} className="text-emerald-500" />}
        />
        <StatCard
          title="Rejected"
          value={statusSummary.rejected}
          valueColorClass="text-red-600"
          icon={<XCircle size={20} className="text-red-500" />}
        />
      </div>

      <div className="panel-card flex flex-col items-center gap-3 p-4 md:flex-row md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setCurrentPage(1);
              setSearchQuery(event.target.value);
            }}
            placeholder="Search by request id, category, or description..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setCurrentPage(1);
                setStatusFilter(status);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState
          title="No Logs Found"
          description="No requests match your current search/filter criteria."
        />
      ) : (
        <ExpenseTable
          data={filteredLogs}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowClick={() => {}}
          onViewDocument={handleViewDocument}
        />
      )}
    </div>
  );
};

export default ManagerLogs;

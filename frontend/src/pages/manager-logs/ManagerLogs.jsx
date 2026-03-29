import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Search, UserCheck, X, XCircle } from 'lucide-react';
import EmptyState from '../../components/feedback/EmptyState';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import ExpenseTable from '../../components/ui/ExpenseTable';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import expenseService from '../../services/expenseService';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../hooks/useAuth';

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const ManagerLogs = () => {
  const { role, user } = useAuth();
  const normalizedRole = String(role || '').toLowerCase();
  const isAdmin = normalizedRole === 'admin';

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const rowsPerPage = 8;

  useEffect(() => {
    let cancelled = false;

    const loadLogs = async () => {
      try {
        const response = await expenseService.getExpenseLogs();
        if (!cancelled) {
          setLogs(response || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load logs:', err);
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

  useEffect(() => {
    if (selectedLog) {
      document.body.style.overflow = 'hidden';
      return;
    }
    document.body.style.overflow = 'auto';
  }, [selectedLog]);

  const statusSummary = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    for (const item of logs) {
      const status = normalizeStatus(item.status);
      if (status === 'approved' || status === 'paid') {
        approved += 1;
      } else if (status === 'rejected') {
        rejected += 1;
      } else {
        pending += 1;
      }
    }

    return { pending, approved, rejected };
  }, [logs]);

  const myActionCount = useMemo(() => {
    if (!user?.name) return 0;
    return logs.filter((item) => item.reviewedByName && item.reviewedByName === user.name).length;
  }, [logs, user?.name]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return logs.filter((item) => {
      const status = normalizeStatus(item.status);
      const statusMatch = statusFilter === 'All' || status === statusFilter.toLowerCase();
      const queryMatch = query.length === 0
        || item.id?.toLowerCase().includes(query)
        || item.description?.toLowerCase().includes(query)
        || item.category?.toLowerCase().includes(query)
        || item.employeeName?.toLowerCase().includes(query)
        || item.reviewedByName?.toLowerCase().includes(query)
        || item.approvalComment?.toLowerCase().includes(query);

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
          title={isAdmin ? 'Admin Logs' : 'Manager Logs'}
          description="Loading approval activity..."
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
        title={isAdmin ? 'Admin Logs' : 'Manager Logs'}
        description={isAdmin
          ? 'Every admin approval action is tracked here with reviewer and note details.'
          : 'Track requests and approvals across your reporting line.'}
      />

      <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
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
        {isAdmin && (
          <StatCard
            title="Actioned By You"
            value={myActionCount}
            valueColorClass="text-primary"
            icon={<UserCheck size={20} className="text-primary" />}
          />
        )}
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
            placeholder="Search by id, employee, reviewer, category, comment..."
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
          onRowClick={(item) => setSelectedLog(item)}
          onViewDocument={handleViewDocument}
        />
      )}

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <h3 className="text-xl font-semibold tracking-tight text-slate-800">
                Log Entry
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-primary">{selectedLog.id}</p>
                <StatusBadge status={selectedLog.status} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Employee</p>
                  <p className="text-sm font-medium text-slate-800">{selectedLog.employeeName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Category</p>
                  <p className="text-sm font-medium text-slate-800">{selectedLog.category}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Reviewed By</p>
                  <p className="text-sm font-medium text-slate-800">{selectedLog.reviewedByName || 'Not reviewed yet'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Reviewed At</p>
                  <p className="text-sm font-medium text-slate-800">
                    {selectedLog.reviewedAt ? new Date(selectedLog.reviewedAt).toLocaleString() : 'Not reviewed yet'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-widest text-slate-500">Approval Note</p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedLog.approvalComment?.trim() || 'No approval note added.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerLogs;

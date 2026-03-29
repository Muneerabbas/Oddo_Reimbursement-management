import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Funnel, Inbox, RefreshCw, Search, TimerReset, Wallet } from 'lucide-react';
import { CurrencyContext } from '../../contexts/CurrencyContext';
import expenseService from '../../services/expenseService';
import ApprovalCard from '../../components/ui/ApprovalCard';
import ApprovalModal from '../../components/ui/ApprovalModal';
import notificationService from '../../services/notificationService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/feedback/EmptyState';
import { CardGridSkeleton } from '../../components/feedback/Skeleton';



const Approvals = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activeRequest, setActiveRequest] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { selectedCurrency, convertAmount, formatAmount } = useContext(CurrencyContext);

  const fetchApprovalsQueue = async () => {
    setIsLoading(true);
    try {
      const queue = await expenseService.getPendingApprovals();
      setPendingRequests(queue);
    } catch (err) {
      console.error('Queue retrieval failed', err);
      notificationService.error('Failed to load approval queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchApprovalsQueue();
  }, []);

  const categories = useMemo(() => {
    const values = [...new Set(pendingRequests.map((request) => request.category).filter(Boolean))];
    return ['All', ...values];
  }, [pendingRequests]);

  const filteredQueue = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return pendingRequests.filter((request) => {
      const categoryMatch = categoryFilter === 'All' || request.category === categoryFilter;
      if (!query) {
        return categoryMatch;
      }
      const searchable = [
        request.id,
        request.employeeName,
        request.employeeEmail,
        request.category,
        request.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return categoryMatch && searchable.includes(query);
    });
  }, [pendingRequests, searchQuery, categoryFilter]);

  const queueStats = useMemo(() => {
    let totalValue = 0;
    filteredQueue.forEach((request) => {
      const amount = Number(request.amount ?? 0);
      const safeAmount = Number.isFinite(amount) ? amount : 0;
      totalValue += convertAmount(safeAmount, request.currency || 'USD');
    });

    const oldest = filteredQueue.length > 0
      ? filteredQueue.reduce((oldestDate, item) => {
        const current = new Date(item.date).getTime();
        return current < oldestDate ? current : oldestDate;
      }, new Date(filteredQueue[0].date).getTime())
      : null;

    return {
      totalCount: filteredQueue.length,
      totalValue,
      oldest,
    };
  }, [filteredQueue, convertAmount]);

  const handleResolveAction = async (id, action, comment) => {
    if (action === 'Rejected' && !comment.trim()) {
      notificationService.error('Add a rejection note so the employee can fix and resubmit.');
      return;
    }

    setIsProcessing(true);
    const toastId = notificationService.loading(`Processing ${action.toLowerCase()}...`);

    try {
      await expenseService.resolveApproval(id, action, comment);
      setPendingRequests((prev) => prev.filter((request) => request.id !== id));
      setActiveRequest(null);
      notificationService.success(`Request ${id} ${action.toLowerCase()} successfully.`, { id: toastId });
    } catch (err) {
      console.error(err);
      notificationService.error(err?.response?.data?.message || err.message || 'Unable to process approval.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDocument = async (request) => {
    try {
      await expenseService.viewExpenseDocument(request.id);
    } catch (err) {
      console.error(err);
      notificationService.error(err.message || 'Unable to open receipt document.');
    }
  };

  return (
    <div className="page-stack relative">
      <PageHeader
        title="Pending Approvals"
        description="Review and resolve live reimbursement requests from your team."
        actions={(
          <button
            type="button"
            onClick={() => void fetchApprovalsQueue()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh Queue
          </button>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="panel-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Visible Requests</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{queueStats.totalCount}</p>
        </div>
        <div className="panel-card p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            <Wallet size={12} />
            Total Value
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
             <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                {formatAmount(queueStats.totalValue, selectedCurrency)}
             </span>
          </div>
        </div>
        <div className="panel-card p-4">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            <TimerReset size={12} />
            Oldest Request
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {queueStats.oldest ? new Date(queueStats.oldest).toLocaleDateString() : '-'}
          </p>
        </div>
      </div>

      <div className="panel-card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-lg">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by employee, request ID, category, or description..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            disabled={isLoading}
            className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50"
          />
        </div>

        <div className="relative min-w-[190px]">
          <Funnel size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'All' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <CardGridSkeleton cards={6} />
      ) : filteredQueue.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Approval Queue Is Clear"
          description="No matching pending requests right now."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredQueue.map((request) => (
            <ApprovalCard
              key={request.id}
              request={request}
              onClick={setActiveRequest}
            />
          ))}
        </div>
      )}

      <ApprovalModal
        request={activeRequest}
        onClose={() => setActiveRequest(null)}
        onResolve={handleResolveAction}
        onViewDocument={handleViewDocument}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default Approvals;

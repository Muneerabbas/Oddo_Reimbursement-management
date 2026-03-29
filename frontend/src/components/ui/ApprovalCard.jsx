import React from 'react';
import { ArrowRightCircle, Calendar, CircleDollarSign, FolderOpen, UserRound } from 'lucide-react';

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

const ApprovalCard = ({ request, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(request)}
      className="group panel-card flex h-full w-full flex-col overflow-hidden p-0 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Pending
        </div>
        <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
          {request.id}
        </span>
      </div>

      <div className="flex-1 space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <UserRound size={15} className="text-slate-500" />
              <span className="truncate">{request.employeeName}</span>
            </p>
            {request.employeeEmail && (
              <p className="mt-1 truncate text-xs text-slate-500">{request.employeeEmail}</p>
            )}
          </div>
          <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {request.approvalStep}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <p className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1">
            <Calendar size={12} />
            {new Date(request.date).toLocaleDateString()}
          </p>
          <p className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1">
            <FolderOpen size={12} />
            {request.category}
          </p>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
          {request.description}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
            <CircleDollarSign size={12} />
            Amount
          </p>
          <p className="text-lg font-bold text-slate-900">
            {formatCurrencyValue(request.amount, request.currency)}
          </p>
        </div>

        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          Open
          <ArrowRightCircle size={17} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
};

export default ApprovalCard;

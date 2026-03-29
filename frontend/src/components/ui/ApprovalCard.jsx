import React from 'react';
import { User, Calendar, FolderOpen, ArrowRightCircle } from 'lucide-react';

const ApprovalCard = ({ request, onClick }) => {
  return (
    <div
      onClick={() => onClick(request)}
      className="panel-card flex h-full cursor-pointer flex-col overflow-hidden p-0 transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {request.approvalStep}
          </span>
        </div>
        <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-400 transition-colors">
          {request.id}
        </span>
      </div>

      <div className="flex-1 p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <User size={20} />
            </div>
            <div>
              <h3 className="font-bold leading-tight text-slate-800">{request.employeeName}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {new Date(request.date).toLocaleDateString()}
                </span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5">
                  <FolderOpen size={12} /> {request.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-600">
          "{request.description}"
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-4 transition-colors">
        <div>
          <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">Payload Value</p>
          <p className="text-lg font-bold text-slate-900">
            {request.currency === 'USD' ? '$' : ''}
            {typeof request.amount === 'number'
              ? request.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })
              : request.amount}
            {request.currency && request.currency !== 'USD' ? ` ${request.currency}` : ''}
          </p>
        </div>

        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          Review Request <ArrowRightCircle size={18} />
        </span>
      </div>
    </div>
  );
};

export default ApprovalCard;

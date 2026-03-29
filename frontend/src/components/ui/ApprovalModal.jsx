import React, { useEffect, useMemo, useState, useContext } from 'react';
import {
  Calculator,
  CheckCircle2,
  FileText,
  Info,
  MessageSquareText,
  X,
  XCircle,
} from 'lucide-react';
import { CurrencyContext } from '../../contexts/CurrencyContext';



const ApprovalModal = ({
  request,
  onClose,
  onResolve,
  onViewDocument,
  isProcessing,
}) => {
  const [comment, setComment] = useState('');
  const { selectedCurrency, formatAmount } = useContext(CurrencyContext);



  useEffect(() => {
    if (!request) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [request]);

  useEffect(() => {
    if (request) {
      setComment('');
    }
  }, [request?.id]);

  const requestAmount = useMemo(
    () => formatAmount(request?.amount, request?.currency),
    [request?.amount, request?.currency, formatAmount],
  );

  const originalAmountText = useMemo(() => {
    if (!request || !request.currency || request.currency === selectedCurrency) return null;
    const numeric = Number(request.amount ?? 0);
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: request.currency }).format(numeric);
    } catch {
      return `${numeric} ${request.currency}`;
    }
  }, [request, selectedCurrency]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-[linear-gradient(120deg,_#eff6ff_0%,_#f8fafc_55%,_#ffffff_100%)] px-6 py-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">Review Approval Request</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {request.id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Employee</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{request.employeeName}</p>
              {request.employeeEmail && (
                <p className="text-xs text-slate-600">{request.employeeEmail}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Expense Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {new Date(request.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Requested Amount</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{requestAmount}</p>
              {originalAmountText && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <Calculator size={12} />
                  Original: {originalAmountText}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Category</p>
            <p className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
              {request.category}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Description</p>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm leading-relaxed text-slate-700">{request.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800" htmlFor="approval-comment">
              <MessageSquareText size={15} className="text-slate-500" />
              Decision Note
            </label>
            <textarea
              id="approval-comment"
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={isProcessing}
              placeholder="Required for rejection, optional for approval."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50"
            />
            <p className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Info size={13} />
              Keep notes concise. They appear in the expense audit trail.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => onViewDocument?.(request)}
            disabled={isProcessing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            <FileText size={16} />
            View Receipt
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onResolve(request.id, 'Rejected', comment)}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              <XCircle size={16} />
              Reject
            </button>
            <button
              type="button"
              onClick={() => onResolve(request.id, 'Approved', comment)}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;

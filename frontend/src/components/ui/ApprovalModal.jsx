import React, { useEffect, useMemo, useState } from 'react';
import { X, CheckCircle, XCircle, Info, Calculator } from 'lucide-react';

const fallbackRates = { USD: 1.00, EUR: 1.09, GBP: 1.27, INR: 0.012, CAD: 0.74 };

const ApprovalModal = ({ 
   request, 
   onClose, 
   onResolve, 
   isProcessing 
}) => {
  const [comment, setComment] = useState('');

  const estimatedConversion = useMemo(() => {
    if (!request?.amount || request?.currency === 'USD') {
      return null;
    }

    const rate = fallbackRates[request.currency] || 1;
    const mapped = (parseFloat(request.amount) * rate).toFixed(2);
    return `$${mapped} USD`;
  }, [request]);

  // Trap scrolling 
  useEffect(() => {
    if (!request) return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, [request]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/50 transition-all">
       <div 
         className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
         role="dialog"
       >
          {/* Header Action Ribbon */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
             <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Review Payload</h3>
                <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">Transaction: {request.id}</p>
             </div>
             
             <button 
                onClick={onClose}
                disabled={isProcessing}
                className="text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 rounded-full hover:bg-slate-200/50 transition-colors disabled:opacity-50"
             >
                <X size={20} />
             </button>
          </div>

          <div className="p-6 sm:p-8">
             
             {/* Key Highlight Metrics */}
             <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4 bg-primary/5 rounded-xl p-5 border border-primary/20">
                <div>
                   <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Submitting Employee</p>
                   <p className="text-lg font-bold text-primary">{request.employeeName}</p>
                   <p className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                      <span className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">Dept: General</span>
                   </p>
                </div>

                <div className="text-left sm:text-right">
                   <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Requested Coverage</p>
                   <p className="text-3xl font-bold text-slate-900 tracking-tight">
                        {request.currency === 'USD' || !request.currency ? '$' : ''}
                        {typeof request.amount === 'number' ? request.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : request.amount}
                        {request.currency && request.currency !== 'USD' ? ` ${request.currency}` : ''}
                   </p>
                   {estimatedConversion && (
                      <p className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-1 justify-start sm:justify-end">
                         <Calculator size={12} /> Est. {estimatedConversion}
                      </p>
                   )}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
                <div className="col-span-1">
                   <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-1">Receipt Date</p>
                   <p className="text-slate-900 font-medium">{new Date(request.date).toLocaleDateString()}</p>
                </div>
                <div className="col-span-1">
                   <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-1">Transaction Type</p>
                   <p className="text-slate-900 font-medium">{request.category}</p>
                </div>
                <div className="col-span-2">
                   <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-1.5">Employee Provided Rationale</p>
                   <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-sm text-slate-700 leading-relaxed italic line-clamp-4">
                         "{request.description}"
                      </p>
                   </div>
                </div>
             </div>

             <hr className="border-slate-100 mb-6" />

             {/* Workflow Resolution Control */}
             <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-800 flex items-center gap-2">
                   Manager Justification Log <Info size={14} className="text-slate-400" />
                </label>
                <textarea
                  rows="3"
                  placeholder="Mandatory if rejecting. Highly recommended if approving large sums."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors resize-none disabled:bg-slate-50 text-sm"
                />
             </div>

          </div>

          {/* Action Footer Ribbon */}
          <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
             <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors w-full sm:w-auto"
             >
                Cancel Action
             </button>

             <button
                type="button"
                onClick={() => onResolve(request.id, 'Rejected', comment)}
                disabled={isProcessing}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 shadow-red-600/20 hover:shadow-red-600/40 transition-all flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
             >
                <XCircle size={18} /> Reject Claim
             </button>

             <button
                type="button"
                onClick={() => onResolve(request.id, 'Approved', comment)}
                disabled={isProcessing}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
             >
                {isProcessing ? (
                   <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                   <CheckCircle size={18} />
                )}
                Approve Target
             </button>
          </div>

       </div>
    </div>
  );
};

export default ApprovalModal;

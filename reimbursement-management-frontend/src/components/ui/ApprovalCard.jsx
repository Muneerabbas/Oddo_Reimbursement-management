import React from 'react';
import { User, Calendar, FolderOpen, ArrowRightCircle } from 'lucide-react';

const ApprovalCard = ({ request, onClick }) => {
  return (
    <div 
       onClick={() => onClick(request)}
       className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group flex flex-col h-full"
    >
      {/* Upper Status Ribbon */}
      <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
               {request.approvalStep}
            </span>
         </div>
         <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
            {request.id}
         </span>
      </div>

      {/* Core Identifying Details */}
      <div className="p-5 flex-1">
         <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <User size={20} />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800 leading-tight">
                     {request.employeeName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                     <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(request.date).toLocaleDateString()}</span>
                     <span className="hidden sm:inline-block text-slate-300">•</span>
                     <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><FolderOpen size={12}/> {request.category}</span>
                  </div>
               </div>
            </div>
         </div>

         <p className="text-sm text-slate-600 line-clamp-2 mt-4 leading-relaxed">
            "{request.description}"
         </p>
      </div>

      {/* Action / Value Footer */}
      <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-white group-hover:bg-slate-50/50 transition-colors">
         <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Payload Value</p>
            <p className="text-lg font-bold text-slate-900">
               {request.currency === 'USD' ? '$' : ''}
               {typeof request.amount === 'number' ? request.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : request.amount}
               {request.currency && request.currency !== 'USD' ? ` ${request.currency}` : ''}
            </p>
         </div>
         
         <button className="flex items-center gap-2 text-sm font-semibold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
            Review Request <ArrowRightCircle size={18} />
         </button>
      </div>
    </div>
  );
};

export default ApprovalCard;

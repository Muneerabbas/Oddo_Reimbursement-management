import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Search, Loader2 } from 'lucide-react';
import expenseService from '../../services/expenseService';
import ApprovalCard from '../../components/ui/ApprovalCard';
import ApprovalModal from '../../components/ui/ApprovalModal';

const Approvals = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal tracking states
  const [activeRequest, setActiveRequest] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let unmounted = false;
    const fetchApprovalsQueue = async () => {
      try {
        const queue = await expenseService.getPendingApprovals();
        if (!unmounted) {
           setPendingRequests(queue);
           setIsLoading(false);
        }
      } catch (err) {
         if (!unmounted) {
            console.error("Queue Retrieval failed", err);
            toast.error("Failed to load approval routing queue.");
            setIsLoading(false);
         }
      }
    };
    fetchApprovalsQueue();
    return () => { unmounted = true; };
  }, []);

  const handleResolveAction = async (id, action, comment) => {
    // Validate rejections require comments
    if (action === 'Rejected' && !comment.trim()) {
       toast.error("You must provide reasoning for rejecting this claim.", { duration: 4000 });
       return;
    }

    setIsProcessing(true);
    const renderToastId = toast.loading(`Processing ${action.toLowerCase()}...`);

    try {
       await expenseService.resolveApproval(id, action, comment);
       
       // Visual feedback slice
       setPendingRequests(prev => prev.filter(req => req.id !== id));
       setActiveRequest(null);
       
       toast.success(`Request successfully ${action.toLowerCase()}`, { id: renderToastId, duration: 3000 });
    } catch (err) {
       console.error(err);
       toast.error(`Architecture failed to log ${action} rule.`, { id: renderToastId });
    } finally {
       setIsProcessing(false);
    }
  };

  const filteredQueue = pendingRequests.filter(req => 
     req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     req.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 relative">
       <Toaster position="top-right" />
       
       {/* Meta Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pending Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Review team reimbursement submissions mapping to your department code.</p>
        </div>
      </div>

      {/* Utilities Ribbon */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
         <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
               <Search size={18} />
            </div>
            <input 
               type="text" 
               placeholder="Filter queue by Name or ID..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               disabled={isLoading}
               className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm sm:text-base text-slate-700 bg-white"
            />
         </div>
      </div>

      {/* Core Workflow Grid Engine */}
      {isLoading ? (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px] flex flex-col items-center justify-center text-slate-500">
             <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
             Extracting team workload queue...
         </div>
      ) : filteredQueue.length === 0 ? (
         <div className="bg-white p-16 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
               </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Inbox Zero Achieved</h3>
            <p className="text-sm text-slate-500 mt-2 text-balance max-w-sm">
               You have successfully cleared your entire departmental queue. Great job staying on top of the workflow!
            </p>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredQueue.map(request => (
               <ApprovalCard 
                  key={request.id} 
                  request={request} 
                  onClick={setActiveRequest}
               />
            ))}
         </div>
      )}

      {/* Deep Inspection Render Target */}
      <ApprovalModal 
         request={activeRequest}
         onClose={() => setActiveRequest(null)}
         onResolve={handleResolveAction}
         isProcessing={isProcessing}
      />
    </div>
  );
};

export default Approvals;

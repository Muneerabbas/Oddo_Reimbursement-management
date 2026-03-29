import React, { useState, useEffect } from 'react';
import { Search, Inbox } from 'lucide-react';
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
            notificationService.error('Failed to load approval routing queue.');
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
       notificationService.error('You must provide reasoning for rejecting this claim.', { duration: 4000 });
       return;
    }

    setIsProcessing(true);
    const renderToastId = notificationService.loading(`Processing ${action.toLowerCase()}...`);

    try {
       await expenseService.resolveApproval(id, action, comment);
       
       // Visual feedback slice
       setPendingRequests(prev => prev.filter(req => req.id !== id));
       setActiveRequest(null);
       
       notificationService.success(`Request successfully ${action.toLowerCase()}`, { id: renderToastId, duration: 3000 });
    } catch (err) {
       console.error(err);
       notificationService.error(`Architecture failed to log ${action} rule.`, { id: renderToastId });
    } finally {
       setIsProcessing(false);
    }
  };

  const filteredQueue = pendingRequests.filter(req => 
     req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     req.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-stack relative">
      <PageHeader
        title="Pending Approvals"
        description="Review team reimbursement submissions mapped to your department workflow."
      />

      {/* Utilities Ribbon */}
      <div className="panel-card flex items-center justify-between p-4">
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
         <CardGridSkeleton cards={6} />
      ) : filteredQueue.length === 0 ? (
         <EmptyState
           icon={Inbox}
           title="Inbox Zero Achieved"
           description="You have successfully cleared the entire departmental queue."
         />
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

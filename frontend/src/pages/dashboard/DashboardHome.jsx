import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, FileText, XCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/feedback/EmptyState';
import { StatCardsSkeleton } from '../../components/feedback/Skeleton';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import ExpenseTable from '../../components/ui/ExpenseTable';
import dashboardService from '../../services/dashboardService';

const DashboardHome = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  useEffect(() => {
    let internalCancel = false;

    const fetchDashboardAnalytics = async () => {
      try {
        const data = await dashboardService.getDashboardStats();
        if (!internalCancel) {
          setStats(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!internalCancel) {
          console.error('Dashboard Stats Failed:', err);
          setError('Failed to load dashboard metrics. Please try refreshing.');
          setIsLoading(false);
        }
      }
    };

    fetchDashboardAnalytics();

    return () => {
      internalCancel = true;
    };
  }, []);

  const companyDescription = user?.company?.about;
  const companyMeta = user?.company?.name
    ? `${user.company.name}${user.company.defaultCurrency ? ` · Base currency ${user.company.defaultCurrency}` : ''}`
    : null;

  if (isLoading) {
    return (
      <div className="page-stack">
        <PageHeader
          title={`Welcome back, ${user?.name ? user.name.split(' ')[0] : 'User'}`}
          description="Here's what's happening with your expenses today."
        />
        <StatCardsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Dashboard"
        description={error}
      />
    );
  }

  // Calculate total spend for chart percentages
  const totalSpend = stats.categoryBreakdown?.reduce((sum, cat) => sum + cat.value, 0) || 1;

  return (
    <div className="page-stack">
      <PageHeader
        title={`Welcome back, ${user?.name ? user.name.split(' ')[0] : 'User'}`}
        description="Here's what's happening with your expenses today."
      />

      {(companyMeta || companyDescription) && (
        <div className="panel-card-muted p-4">
          {companyMeta && <p className="text-sm font-medium text-slate-700">{companyMeta}</p>}
          {companyDescription && <p className="mt-1 text-sm text-slate-500">{companyDescription}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <StatCard
          title="Total Submitted"
          value={stats.totalSubmitted}
          valueColorClass="text-slate-900"
          icon={<FileText size={24} className="text-slate-500" />}
          description="Lifetime expenses"
        />

        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          valueColorClass="text-amber-600"
          icon={<Clock size={24} className="text-amber-500" />}
          description="Awaiting review"
        />

        <StatCard
          title="Approved Amount"
          value={`$${stats.approvedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          valueColorClass="text-emerald-600"
          icon={<CheckCircle size={24} className="text-emerald-500" />}
          trend={{ isUp: true, value: '12%' }}
          description="Since last month"
        />

        <StatCard
          title="Rejected Count"
          value={stats.rejectedCount}
          valueColorClass="text-red-600"
          icon={<XCircle size={24} className="text-red-500" />}
          description="Requires attention"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Left Column: Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
          <ExpenseTable 
            data={stats.recentActivity || []}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowClick={(expense) => console.log('Row clicked', expense)}
            onViewDocument={(expense) => console.log('View doc', expense)}
          />
        </div>

        {/* Right Column: Category Breakdown Chart */}
        <div className="lg:col-span-1 space-y-4">
           <h2 className="text-lg font-semibold text-slate-800">Category Breakdown</h2>
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 min-h-[400px]">
             {stats.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
               <div className="space-y-6 mt-2">
                 {stats.categoryBreakdown.map((category) => {
                   const percentage = Math.round((category.value / totalSpend) * 100);
                   return (
                     <div key={category.name} className="relative">
                       <div className="flex items-center justify-between mb-2">
                         <span className="text-sm font-medium text-slate-700">{category.name}</span>
                         <span className="text-sm font-semibold text-slate-900">
                           ${category.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                         </span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                         <div 
                           className={`h-2.5 rounded-full ${category.color} transition-all duration-1000 ease-out`} 
                           style={{ width: `${percentage}%` }}
                         ></div>
                       </div>
                       <div className="mt-1 text-xs text-slate-500 text-right">
                         {percentage}% of total
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="flex h-full flex-col items-center justify-center text-slate-400 py-10">
                 <FileText size={40} className="mb-4 text-slate-200" />
                 <p className="text-sm font-medium">No category data available</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import StatCard from '../../components/ui/StatCard';
import dashboardService from '../../services/dashboardService';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';

const DashboardHome = () => {
  const { user } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
          console.error("Dashboard Stats Failed:", err);
          setError("Failed to load dashboard metrics. Please try refreshing.");
          setIsLoading(false);
        }
      }
    };

    fetchDashboardAnalytics();

    return () => { internalCancel = true; };
  }, []);

  if (isLoading) {
     return (
        <div className="flex h-64 items-center justify-center">
           <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
        </div>
     );
  }

  if (error) {
     return (
        <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-lg shadow-sm">
           <h3 className="font-semibold text-lg mb-2">Error Loading Dashboard</h3>
           <p>{error}</p>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Introduction Area */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          Welcome back, {user?.name ? user.name.split(' ')[0] : 'User'}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 mt-2">
          Here's what's happening with your expenses today.
        </p>
      </header>

      {/* Primary Analytical Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Expenses Setup */}
        <StatCard 
          title="Total Submitted" 
          value={stats.totalSubmitted}
          valueColorClass="text-slate-900" 
          icon={<FileText size={24} className="text-slate-500" />}
          description="Lifetime expenses"
        />

        {/* Pending Approvals */}
        <StatCard 
          title="Pending Approvals" 
          value={stats.pendingApprovals}
          valueColorClass="text-amber-600"
          icon={<Clock size={24} className="text-amber-500" />}
          description="Awaiting review"
        />

        {/* Approved Accumulation */}
        <StatCard 
          title="Approved Amount" 
          value={`$${stats.approvedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          valueColorClass="text-emerald-600"
          icon={<CheckCircle size={24} className="text-emerald-500" />}
          trend={{ isUp: true, value: "12%" }}
          description="Since last month"
        />

        {/* Rejected Metrics */}
        <StatCard 
          title="Rejected Count" 
          value={stats.rejectedCount}
          valueColorClass="text-red-600"
          icon={<XCircle size={24} className="text-red-500" />}
          description="Requires attention"
        />

      </div>

      {/* Generic Placeholder for secondary widgets e.g. "Recent Activity" list */}
      <section className="mt-12">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-64 flex flex-col items-center justify-center text-slate-400">
           <FileText size={48} className="mb-4 opacity-50 text-slate-300" />
           <p className="text-lg font-medium text-slate-500">Recent Activity Area</p>
           <p className="text-sm">A data table can be placed here in the future.</p>
        </div>
      </section>

    </div>
  );
};

export default DashboardHome;

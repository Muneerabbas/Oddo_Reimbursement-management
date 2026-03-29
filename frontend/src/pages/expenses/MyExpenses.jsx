import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, X } from 'lucide-react';
import expenseService from '../../services/expenseService';
import ExpenseTable from '../../components/ui/ExpenseTable';
import StatusBadge from '../../components/ui/StatusBadge';

const MyExpenses = () => {
  // Global Data State
  const [rawExpenses, setRawExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Filtering Local States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(8); 
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'All',
    category: 'All',
  });

  // Modal Interactive State
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Data Aggregation
  useEffect(() => {
    let unmounted = false;
    const fetchData = async () => {
      try {
        const data = await expenseService.getExpenses();
        if (!unmounted) {
          setRawExpenses(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!unmounted) {
           console.error(err);
           setError('Failed to securely fetch history.');
           setIsLoading(false);
        }
      }
    };
    fetchData();
    return () => { unmounted = true; };
  }, []);

  // Compute Filtered Matrix via useMemo for performance caching
  const filteredData = useMemo(() => {
     let temp = [...rawExpenses];

     // Apply explicit Search Query logic
     if (searchQuery.trim() !== '') {
        const lowerQ = searchQuery.toLowerCase();
        temp = temp.filter(exp => 
           (exp.id?.toLowerCase()?.includes(lowerQ)) || 
           (exp.description?.toLowerCase()?.includes(lowerQ))
        );
     }

     // Apply Status Filter Constraint
     if (filters.status !== 'All') {
        temp = temp.filter(exp => exp.status === filters.status);
     }

     // Apply Category Constraint
     if (filters.category !== 'All') {
        temp = temp.filter(exp => exp.category === filters.category);
     }

     return temp;
  }, [rawExpenses, searchQuery, filters]);

  // Adjust pagination if filter cuts down data below active page requirement
  useEffect(() => {
     setCurrentPage(1);
  }, [searchQuery, filters]);


  const handleFilterChange = (e) => {
     const { name, value } = e.target;
     setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Prevent background scrolling natively when Modal activates
  useEffect(() => {
    if (selectedExpense) {
       document.body.style.overflow = 'hidden';
    } else {
       document.body.style.overflow = 'auto';
    }
  }, [selectedExpense]);


  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Header View: Metadata + Call to Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Your Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Review past submissions, track statuses natively, and file new claims.</p>
        </div>
        
        <Link 
          to="/expenses/new" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg shadow-sm hover:bg-primary-dark transition-colors"
        >
          <Plus size={18} />
          Report Expense
        </Link>
      </div>

      {/* Global Utilities Area (Search & Multi-Filters) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Search Description or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm sm:text-base text-slate-700 bg-white"
          />
        </div>
        
        <div className="flex w-full md:w-auto gap-3 flex-col sm:flex-row">
           <div className="relative flex items-center min-w-[140px]">
              <Filter className="absolute left-3 text-slate-400" size={16} />
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                disabled={isLoading}
                className="pl-9 pr-8 py-2 w-full text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                 <option value="All">All Statuses</option>
                 <option value="Approved">Approved</option>
                 <option value="Pending">Pending</option>
                 <option value="Rejected">Rejected</option>
              </select>
           </div>
           <div className="relative flex items-center min-w-[160px]">
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                disabled={isLoading}
                className="px-3 pr-8 py-2 w-full text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                 <option value="All">All Categories</option>
                 <option value="Travel">Category: Travel</option>
                 <option value="Meals">Category: Meals</option>
                 <option value="Supplies">Category: Supplies</option>
                 <option value="Software">Category: Software</option>
                 <option value="Hardware">Category: Hardware</option>
                 <option value="Other">Category: Other</option>
              </select>
           </div>
        </div>
      </div>

      {/* Primary Orchestration Component */}
      {isLoading ? (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px] flex flex-col items-center justify-center text-slate-500 z-10">
             <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
             Loading tracking matrix...
         </div>
      ) : error ? (
         <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200">
            <h3 className="font-semibold">{error}</h3>
         </div>
      ) : (
         <ExpenseTable 
            data={filteredData}
            onRowClick={(expense) => setSelectedExpense(expense)}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
         />
      )}

      {/* Deep Detail Inspection Modal Component */}
      {selectedExpense && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/50 transition-opacity">
            <div 
               className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all duration-300 ease-in-out scale-100"
               role="dialog"
            >
               {/* Modal Header Title Ribbon */}
               <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-xl font-semibold text-slate-800 tracking-tight">
                     Expense Breakdown
                  </h3>
                  <button 
                     onClick={() => setSelectedExpense(null)}
                     className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-full hover:bg-slate-200 transition-colors"
                  >
                     <X size={20} />
                  </button>
               </div>

               {/* Inner Modal Data Content mapping */}
               <div className="p-6">
                  
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">Transaction ID</p>
                        <p className="text-sm font-medium text-primary">{selectedExpense.id}</p>
                     </div>
                     <div className="text-right">
                        <StatusBadge status={selectedExpense.status} />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                     
                     <div className="col-span-2 sm:col-span-1">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Submission Date</p>
                        <p className="text-slate-900 font-medium">{new Date(selectedExpense.date).toLocaleDateString()}</p>
                     </div>
                     
                     <div className="col-span-2 sm:col-span-1">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Fiscal Category</p>
                        <p className="text-slate-900 font-medium">{selectedExpense.category}</p>
                     </div>

                     <div className="col-span-2">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Total Payload Cost</p>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">
                           {selectedExpense.currency === 'USD' || !selectedExpense.currency ? '$' : ''}
                           {typeof selectedExpense.amount === 'number' ? selectedExpense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : selectedExpense.amount}
                           {selectedExpense.currency && selectedExpense.currency !== 'USD' ? ` ${selectedExpense.currency}` : ''}
                        </p>
                     </div>

                     <div className="col-span-2 bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-semibold">Reported Description</p>
                        <p className="text-sm flex flex-col text-slate-700 leading-relaxed text-balance">
                           {selectedExpense.description}
                        </p>
                     </div>

                  </div>
               </div>

               {/* Empty Footer for structure padding & closing */}
               <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button 
                     onClick={() => setSelectedExpense(null)}
                     className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                  >
                     Close Window
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default MyExpenses;

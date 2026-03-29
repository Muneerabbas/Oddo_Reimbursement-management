import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical } from 'lucide-react';
import expenseService from '../../services/expenseService';
import { useAuth } from '../../hooks/useAuth';

const ExpenseList = () => {
  const { user } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtering variables
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-fetch data safely resolving Promise mounting
  useEffect(() => {
    let internalCancel = false;

    const pullDataHistory = async () => {
      try {
        const fetchedData = await expenseService.getExpenses();
        if (!internalCancel) {
          setExpenses(fetchedData);
          setIsLoading(false);
        }
      } catch (err) {
        if (!internalCancel) {
          console.error("List Fetch Error:", err);
          setError("Failed to fetch expense records. Service unavailable.");
          setIsLoading(false);
        }
      }
    };

    pullDataHistory();

    return () => { internalCancel = true; };
  }, []);

  // Compute status badges color mappings
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Approved</span>;
      case 'Rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      case 'Pending':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending Review</span>;
    }
  };

  // Perform client-side tracking filter logic cleanly
  const filteredData = expenses.filter(exp => 
    exp.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header View: Metadata + Call to Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Your Expense History</h1>
          <p className="text-sm text-slate-500 mt-1">Review past submissions, track reporting statuses, and file new claims.</p>
        </div>
        
        <Link 
          to="/expenses/new" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg shadow-sm hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
        >
          <Plus size={18} />
          Create Expense
        </Link>
      </div>

      {/* Global Utilities Area (Search & Filter Layout) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Responsive Search Box */}
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input 
            type="text" 
            placeholder="Search by ID, Description, or Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg rounded-r-none outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm sm:text-base text-slate-700 bg-white"
          />
        </div>
        
        {/* Placeholder Options Dropdown Button */}
        <button 
          className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 w-full sm:w-auto"
        >
          <Filter size={16} />
          Filters
        </button>
      </div>

      {/* Data Visual Table Segment */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-white/60 z-10 backdrop-blur-sm">
             <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
             Loading tracking history...
          </div>
        ) : error ? (
           <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-red-600 bg-red-50/50">
             {error}
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Transaction ID</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Description</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              {/* Seamless Data Table Injection */}
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredData.length > 0 ? (
                  filteredData.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {expense.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                        {expense.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 hidden sm:table-cell truncate max-w-xs xl:max-w-md">
                        {expense.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(expense.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors rounded p-1 hover:bg-slate-100">
                           <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                   <tr>
                     <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                       <span className="block font-medium text-slate-700 mb-1">No reimbursement records found</span>
                       {searchQuery ? "Try adjusting your search criteria." : "Get started by submitting your first company expense claim above."}
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default ExpenseList;

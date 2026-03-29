import React, { useContext } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { CurrencyContext } from '../../contexts/CurrencyContext';
import StatusBadge from './StatusBadge';

const ExpenseTable = ({ 
  data, 
  onRowClick, 
  onViewDocument,
  currentPage, 
  rowsPerPage, 
  onPageChange 
}) => {
  const { formatAmount } = useContext(CurrencyContext);
  
  // Isolate mathematical arrays for UI mapping
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentDataSliver = data.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px] flex flex-col justify-between">
      
      {/* Scrollable Container */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Transaction ID</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">Description</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Document</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-slate-100">
            {currentDataSliver.length > 0 ? (
              currentDataSliver.map((expense) => (
                <tr 
                   key={expense.id} 
                   onClick={() => onRowClick(expense)}
                   className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary hidden sm:table-cell group-hover:underline">
                    {expense.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                    {expense.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 hidden md:table-cell truncate max-w-[200px] lg:max-w-xs">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                    {formatAmount(expense.amount, expense.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onViewDocument(expense);
                      }}
                      className="font-medium text-primary hover:underline"
                    >
                      View Document
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={expense.status} />
                  </td>
                </tr>
              ))
            ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                    <span className="block font-medium text-slate-700 mb-1">No reimbursement records found</span>
                    <span className="text-sm">Try adjusting your active display filters.</span>
                  </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Robust Pagination Controls */}
      {data.length > 0 && (
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
             {/* Mobile specific navigation block */}
             <button
               onClick={() => onPageChange(currentPage - 1)}
               disabled={currentPage === 1}
               className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
             >
               Previous
             </button>
             <button
               onClick={() => onPageChange(currentPage + 1)}
               disabled={currentPage === totalPages}
               className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
             >
               Next
             </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + rowsPerPage, data.length)}</span> of{' '}
                <span className="font-medium">{data.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {/* Dynamically build array of page integers */}
                {[...Array(totalPages)].map((_, i) => (
                   <button
                     key={i + 1}
                     onClick={() => onPageChange(i + 1)}
                     className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1 
                           ? 'z-10 bg-primary-50 border-primary text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary' // Active
                           : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50' // Passive
                     }`}
                   >
                     {i + 1}
                   </button>
                ))}

                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;

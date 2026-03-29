import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileType2, Calendar, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import expenseService from '../../services/expenseService';

const SubmitExpense = () => {
  const navigate = useNavigate();

  // Local component form structure
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    description: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);

  // Map generic input variations
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Explicit visual file selection (Does not upload natively)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileDetails({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
      });
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileDetails({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!formData.category || !formData.amount || !formData.description) {
      setError('Please fill out all required fields.');
      setIsLoading(false);
      return;
    }

    try {
      // Simulate network interaction
      await expenseService.submitExpense(formData);
      
      // On success, flip back up onto the Expense List table
      navigate('/expenses', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Failed to submit expense. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          Submit New Expense
        </h1>
        <p className="text-slate-500 mt-2">
           Fill out the form below to request a reimbursement against corporate policy.
        </p>
      </header>

      {/* Primary Forms Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Dynamic Alerts */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 p-4 text-red-700 flex items-start gap-3">
             <AlertCircle size={20} className="mt-0.5 shrink-0" />
             <div>
                <p className="font-semibold text-sm">Submission Error</p>
                <p className="text-sm mt-1">{error}</p>
             </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Amount Component */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="amount">
                Expense Amount ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  id="amount"
                  name="amount"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full pl-7 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="date">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar size={18} />
                </div>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Category Component */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="category">
                Expense Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FileType2 size={18} />
                </div>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none bg-white transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${!formData.category ? 'text-slate-400' : 'text-slate-900'}`}
                >
                  <option value="" disabled>Select category classification...</option>
                  <option value="Travel">Travel & Transportation</option>
                  <option value="Meals">Meals & Entertainment</option>
                  <option value="Supplies">Office Supplies</option>
                  <option value="Software">Software Subscriptions</option>
                  <option value="Hardware">Hardware / Equipment</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
              </div>
            </div>

            {/* Description Area */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="description">
                Business Purpose Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows="3"
                placeholder="Briefly describe the business need for this expense..."
                value={formData.description}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors resize-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Dummy Drag & Drop Receipt Sector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
               Receipt Attachment 
            </label>
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${fileDetails ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
            >
              
              {!fileDetails ? (
                <>
                  <UploadCloud size={40} className="text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700 text-center">
                    Drag and drop your receipt here, or <span className="text-primary cursor-pointer hover:underline">browse files</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2 text-center text-balance">
                    Supported formats: .pdf, .jpg, .png. Maximum mock file size: 5MB.
                  </p>

                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    onChange={handleFileChange}
                    accept=".pdf,image/*"
                    disabled={isLoading}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <FileText size={40} className="text-primary mb-3" />
                  <p className="text-sm font-semibold text-slate-800">{fileDetails.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{fileDetails.size} attached correctly</p>
                  <button 
                    type="button" 
                    onClick={() => setFileDetails(null)}
                    disabled={isLoading}
                    className="mt-4 text-xs font-medium text-red-600 hover:text-red-700 focus:outline-none p-1"
                  >
                    Remove attachment
                  </button>
                </div>
              )}
            </div>
            {/* Visual reassurance check for users */}
            {fileDetails && (
               <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium ml-1">
                  <CheckCircle size={14} /> Documentation readied for submission upload
               </div>
            )}
          </div>

          {/* Form Finalization Call To Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
               type="button"
               onClick={() => navigate('/expenses')}
               disabled={isLoading}
               className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Cancel Draft
            </button>

            <button
               type="submit"
               disabled={isLoading}
               className="px-5 py-2 text-sm font-semibold text-white bg-primary rounded-lg shadow hover:bg-primary-dark hover:shadow-md transition-all flex items-center gap-2 min-w-[140px] justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
               {isLoading ? (
                  <>
                     <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                     <span>Submitting...</span>
                  </>
               ) : (
                  <span>Submit Request</span>
               )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default SubmitExpense;

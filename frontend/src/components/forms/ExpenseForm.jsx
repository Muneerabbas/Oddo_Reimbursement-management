import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UploadCloud, FileType2, Calendar, FileText, ScanLine, Calculator } from 'lucide-react';
import expenseService from '../../services/expenseService';
import notificationService from '../../services/notificationService';

const exchangeRates = {
  USD: 1.0,
  EUR: 1.09,
  GBP: 1.27,
  INR: 0.012,
  CAD: 0.74,
};

const ExpenseForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    currency: 'USD',
    description: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [fileDetails, setFileDetails] = useState(null);
  const [convertedPreview, setConvertedPreview] = useState(null);
  const [aiExtraction, setAiExtraction] = useState(null);

  const lowConfidenceFields = useMemo(() => {
    if (!aiExtraction) return new Set();
    return new Set(
      Object.entries(aiExtraction)
        .filter(([, value]) => value && typeof value === 'object' && value.confidence < 0.65)
        .map(([key]) => key),
    );
  }, [aiExtraction]);

  useEffect(() => {
    if (formData.amount && formData.currency !== 'USD') {
      const rate = exchangeRates[formData.currency] || 1;
      const converted = (parseFloat(formData.amount) * rate).toFixed(2);
      setConvertedPreview(`~ $${converted} USD`);
    } else {
      setConvertedPreview(null);
    }
  }, [formData.amount, formData.currency]);

  useEffect(() => {
    const prefill = location.state?.prefillExpense;
    if (!prefill) return;

    setFormData((prev) => ({
      ...prev,
      amount: prefill.amount != null ? String(prefill.amount) : prev.amount,
      date: prefill.date || prev.date,
      category: prefill.category || prev.category,
      description: prefill.description || prev.description,
      currency: prefill.currency || prev.currency,
    }));
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilePicked = (file) => {
    if (!file) return;
    setAiExtraction(null);
    setFileDetails({
      file,
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    });
  };

  const handleFileChange = (e) => {
    handleFilePicked(e.target.files?.[0]);
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    handleFilePicked(e.dataTransfer.files?.[0]);
  };

  const handleAutoFillOCR = async () => {
    if (!fileDetails?.file) {
      notificationService.error('Please upload a receipt first!');
      return;
    }

    setIsOcrLoading(true);
    const toastId = notificationService.loading('Extracting data with OCR + AI...');

    try {
      const extractedData = await expenseService.extractExpenseFromReceipt(fileDetails.file);
      const suggestion = extractedData?.suggestedExpense || {};
      const extraction = extractedData?.extraction || null;
      setAiExtraction(extraction);

      const extractedAmount = suggestion.amount ?? extraction?.amount?.value ?? null;
      const extractedCurrency = suggestion.currency || extraction?.currency?.value || 'USD';
      const extractedDate =
        suggestion.date || extraction?.date?.value || new Date().toISOString().split('T')[0];
      const extractedCategory =
        suggestion.category || extraction?.category?.value || 'Other';
      const extractedDescription =
        suggestion.description ||
        extraction?.description?.value ||
        (suggestion.vendor ? `Expense at ${suggestion.vendor}` : '') ||
        'Receipt-based business expense';

      setFormData((prev) => ({
        ...prev,
        amount: extractedAmount != null ? String(extractedAmount) : prev.amount,
        date: extractedDate || prev.date,
        category: extractedCategory || prev.category || 'Other',
        description: extractedDescription || prev.description || 'Receipt-based business expense',
        currency: extractedCurrency || prev.currency || 'USD',
      }));

      const confidencePct = Math.round((extraction?.confidence || 0) * 100);
      notificationService.success(`Receipt parsed (${confidencePct}% confidence).`, { id: toastId });
    } catch (err) {
      console.error(err);
      notificationService.error(err.message || 'AI scanning failed. Please enter manually.', {
        id: toastId,
      });
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.category || !formData.amount || !formData.description) {
      notificationService.error('Please fill out all required fields.');
      setIsLoading(false);
      return;
    }

    if (!fileDetails?.file) {
      notificationService.error('Please attach the receipt before submitting.');
      setIsLoading(false);
      return;
    }

    const processToast = notificationService.loading('Submitting expense...');

    try {
      await expenseService.submitExpense({
        ...formData,
        file: fileDetails.file,
      });

      notificationService.success('Successfully submitted!', { id: processToast, duration: 2500 });
      setTimeout(() => {
        navigate('/expenses', { replace: true });
      }, 1000);
    } catch (err) {
      console.error(err);
      notificationService.error(err.message || 'Failed to submit. Please check connection.', {
        id: processToast,
      });
      setIsLoading(false);
    }
  };

  const inputBorder = (key) =>
    lowConfidenceFields.has(key) ? 'border-amber-400 bg-amber-50/40' : 'border-slate-300';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="amount">
              Expense Amount <span className="text-red-500">*</span>
            </label>
            <div className="flex relative items-stretch">
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
                disabled={isLoading || isOcrLoading}
                className={`w-full pl-4 pr-4 py-2 border rounded-l-lg border-r-0 focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${inputBorder('amount')}`}
              />

              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                disabled={isLoading || isOcrLoading}
                className={`bg-slate-50 border text-slate-700 text-sm rounded-r-lg focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 focus:outline-none transition-colors px-3 py-2 disabled:text-slate-400 ${inputBorder('currency')}`}
              >
                {Object.keys(exchangeRates).map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>

            {convertedPreview && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <Calculator size={12} />
                <span>Estimated Payout: {convertedPreview}</span>
              </div>
            )}
          </div>

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
                disabled={isLoading || isOcrLoading}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${inputBorder('date')}`}
              />
            </div>
          </div>

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
                disabled={isLoading || isOcrLoading}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none bg-white transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${!formData.category ? 'text-slate-400' : 'text-slate-900'} ${inputBorder('category')}`}
              >
                <option value="" disabled>
                  Select category classification...
                </option>
                <option value="Travel">Travel & Transportation</option>
                <option value="Meals">Meals & Entertainment</option>
                <option value="Supplies">Office Supplies</option>
                <option value="Software">Software Subscriptions</option>
                <option value="Hardware">Hardware / Equipment</option>
                <option value="Other">Other Miscellaneous</option>
              </select>
            </div>
          </div>

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
              disabled={isLoading || isOcrLoading}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors resize-none disabled:bg-slate-50 disabled:text-slate-500 ${inputBorder('description')}`}
            />
          </div>
        </div>

        {aiExtraction && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">AI extraction</span>
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                Confidence {Math.round((aiExtraction.confidence || 0) * 100)}%
              </span>
            </div>
            {Array.isArray(aiExtraction.flags) && aiExtraction.flags.length > 0 && (
              <div className="text-amber-700">Flags: {aiExtraction.flags.join(', ')}</div>
            )}
            <p className="text-slate-600 text-xs">
              Low-confidence fields are highlighted in amber. Please review before submitting.
            </p>
          </div>
        )}

        <hr className="border-slate-200" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">Receipt Upload</label>
            {fileDetails && (
              <button
                type="button"
                onClick={handleAutoFillOCR}
                disabled={isLoading || isOcrLoading}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-full transition-colors disabled:opacity-50"
              >
                {isOcrLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-700 border-t-transparent" />
                ) : (
                  <ScanLine size={12} />
                )}
                Auto-Fill with AI
              </button>
            )}
          </div>

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${
              fileDetails
                ? 'border-primary bg-primary/5'
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            }`}
          >
            {!fileDetails ? (
              <>
                <UploadCloud size={40} className="text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-700 text-center">
                  Drag and drop your receipt here, or{' '}
                  <span className="text-primary cursor-pointer hover:underline">browse files</span>
                </p>
                <p className="text-xs text-slate-400 mt-2 text-center text-balance">
                  Supported formats: .pdf, .jpg, .png, and common office docs. Maximum file size: 10MB.
                </p>

                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept=".pdf,image/*"
                  disabled={isLoading || isOcrLoading}
                />
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <FileText size={40} className="text-primary mb-3" />
                <p className="text-sm font-semibold text-slate-800">{fileDetails.name}</p>
                <p className="text-xs text-slate-500 mt-1">{fileDetails.size} attached correctly</p>
                <button
                  type="button"
                  onClick={() => {
                    setFileDetails(null);
                    setAiExtraction(null);
                  }}
                  disabled={isLoading || isOcrLoading}
                  className="mt-4 text-xs font-medium text-red-600 hover:text-red-700 focus:outline-none p-1"
                >
                  Remove attachment
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            disabled={isLoading || isOcrLoading}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel Draft
          </button>

          <button
            type="submit"
            disabled={isLoading || isOcrLoading}
            className="px-5 py-2 text-sm font-semibold text-white bg-primary rounded-lg shadow hover:bg-primary-dark hover:shadow-md transition-all flex items-center gap-2 min-w-[140px] justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Request</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;

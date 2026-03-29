import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileType2,
  Calendar,
  FileText,
  ScanLine,
  Calculator,
  Sparkles,
  BadgeCheck,
  AlertTriangle,
} from 'lucide-react';
import expenseService from '../../services/expenseService';
import notificationService from '../../services/notificationService';

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
  const [deviceCurrency, setDeviceCurrency] = useState('USD');
  const [deviceCountryName, setDeviceCountryName] = useState('');
  const [supportedCurrencies] = useState(expenseService.getSupportedCurrencies());
  const [currencySearch, setCurrencySearch] = useState('');

  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toUpperCase();
    if (!q) return supportedCurrencies;
    return supportedCurrencies.filter((cur) => cur.includes(q));
  }, [supportedCurrencies, currencySearch]);

  const lowConfidenceFields = useMemo(() => {
    if (!aiExtraction) return new Set();
    return new Set(
      Object.entries(aiExtraction)
        .filter(([, value]) => value && typeof value === 'object' && value.confidence < 0.65)
        .map(([key]) => key),
    );
  }, [aiExtraction]);

  const completion = useMemo(() => {
    const checks = [
      !!formData.amount,
      !!formData.date,
      !!formData.category,
      !!formData.description,
      !!fileDetails?.file,
    ];
    const completed = checks.filter(Boolean).length;
    const total = checks.length;
    const percent = Math.round((completed / total) * 100);
    return { completed, total, percent };
  }, [formData, fileDetails]);

  useEffect(() => {
    let active = true;
    const detect = async () => {
      try {
        const ctx = await expenseService.detectDeviceCurrencyContext();
        if (!active) return;
        setDeviceCurrency(ctx.currency || 'USD');
        setDeviceCountryName(ctx.countryName || '');
        setFormData((prev) => ({
          ...prev,
          currency: prev.currency === 'USD' ? (ctx.currency || 'USD') : prev.currency,
        }));
      } catch {
        if (!active) return;
        setDeviceCurrency('USD');
      }
    };
    void detect();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!formData.amount) {
        setConvertedPreview(null);
        return;
      }
      try {
        const result = await expenseService.convertCurrencyAmount(
          formData.amount,
          formData.currency,
          deviceCurrency,
        );
        if (!active || !result) return;
        const base = Number(formData.amount).toFixed(2);
        setConvertedPreview(
          `${base} ${formData.currency} ~ ${result.convertedAmount.toFixed(2)} ${deviceCurrency}`,
        );
      } catch {
        if (!active) return;
        setConvertedPreview('Live conversion unavailable right now');
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [formData.amount, formData.currency, deviceCurrency]);

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
        suggestion.category || extraction?.expenseType?.value || extraction?.category?.value || 'Other';
      const extractedLines = Array.isArray(extraction?.expenseLines) ? extraction.expenseLines : [];
      const linesPreview = extractedLines
        .slice(0, 3)
        .map((line) => line?.label)
        .filter(Boolean)
        .join(', ');
      const extractedDescription =
        suggestion.description ||
        extraction?.description?.value ||
        (linesPreview ? `Items: ${linesPreview}` : '') ||
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
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] shadow-[0_24px_65px_-35px_rgba(15,23,42,0.4)]">
      <form onSubmit={handleSubmit} className="space-y-8 p-6 sm:p-8">
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Submission Readiness
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {completion.completed} of {completion.total} required items completed
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
              {completion.percent}%
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                completion.percent === 100 ? 'bg-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              {fileDetails ? <BadgeCheck size={13} className="text-emerald-600" /> : <UploadCloud size={13} />}
              {fileDetails ? 'Receipt attached' : 'Receipt pending'}
            </span>
            {aiExtraction && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Sparkles size={13} />
                OCR confidence {Math.round((aiExtraction.confidence || 0) * 100)}%
              </span>
            )}
            {lowConfidenceFields.size > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                <AlertTriangle size={13} />
                {lowConfidenceFields.size} field{lowConfidenceFields.size === 1 ? '' : 's'} need review
              </span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-900">Expense Details</h3>
            <p className="mt-1 text-sm text-slate-500">Fill core transaction details before upload.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="amount">
                Expense Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-stretch">
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
                  className={`w-full rounded-l-xl border border-r-0 px-4 py-2.5 focus:z-10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50 disabled:text-slate-500 ${inputBorder('amount')}`}
                />
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  disabled={isLoading || isOcrLoading}
                  className={`rounded-r-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:z-10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:text-slate-400 ${inputBorder('currency')}`}
                >
                  {supportedCurrencies.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
              {convertedPreview && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <Calculator size={12} />
                  <span>
                    Estimate ({deviceCountryName || 'your locale'}): {convertedPreview}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="date">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                  className={`w-full rounded-xl border py-2.5 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50 disabled:text-slate-500 ${inputBorder('date')}`}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category">
                Expense Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <FileType2 size={18} />
                </div>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={isLoading || isOcrLoading}
                  className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50 disabled:text-slate-500 ${!formData.category ? 'text-slate-400' : 'text-slate-900'} ${inputBorder('category')}`}
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
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="description">
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
                className={`w-full resize-none rounded-xl border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50 disabled:text-slate-500 ${inputBorder('description')}`}
              />
            </div>
          </div>
        </section>

        {aiExtraction && (
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">AI extraction</span>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Confidence {Math.round((aiExtraction.confidence || 0) * 100)}%
              </span>
            </div>
            {Array.isArray(aiExtraction.flags) && aiExtraction.flags.length > 0 && (
              <div className="mt-1.5 text-amber-700">Flags: {aiExtraction.flags.join(', ')}</div>
            )}
            {Array.isArray(aiExtraction.expenseLines) && aiExtraction.expenseLines.length > 0 && (
              <div className="mt-1.5 text-xs text-slate-700">
                Extracted lines:{' '}
                {aiExtraction.expenseLines
                  .slice(0, 4)
                  .map((l) => l.label)
                  .filter(Boolean)
                  .join(', ')}
              </div>
            )}
            <p className="mt-1.5 text-xs text-slate-600">
              Low-confidence fields are highlighted in amber. Please review before submitting.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Receipt Upload</h3>
              <p className="mt-1 text-sm text-slate-500">Attach the bill and optionally auto-fill fields.</p>
            </div>
            {fileDetails && (
              <button
                type="button"
                onClick={handleAutoFillOCR}
                disabled={isLoading || isOcrLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                {isOcrLoading ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
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
            className={`relative flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              fileDetails
                ? 'border-primary/50 bg-primary/5'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
            }`}
          >
            {!fileDetails ? (
              <>
                <UploadCloud size={40} className="mb-3 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">
                  Drag and drop your receipt here, or{' '}
                  <span className="cursor-pointer text-primary hover:underline">browse files</span>
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Supported formats: .pdf, .jpg, .png. Maximum file size: 10MB.
                </p>

                <input
                  type="file"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handleFileChange}
                  accept=".pdf,image/*"
                  disabled={isLoading || isOcrLoading}
                />
              </>
            ) : (
              <div className="flex flex-col items-center">
                <FileText size={40} className="mb-3 text-primary" />
                <p className="text-sm font-semibold text-slate-800">{fileDetails.name}</p>
                <p className="mt-1 text-xs text-slate-500">{fileDetails.size} attached successfully</p>
                <button
                  type="button"
                  onClick={() => {
                    setFileDetails(null);
                    setAiExtraction(null);
                  }}
                  disabled={isLoading || isOcrLoading}
                  className="mt-4 p-1 text-xs font-medium text-red-600 hover:text-red-700 focus:outline-none"
                >
                  Remove attachment
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-2">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            disabled={isLoading || isOcrLoading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            Cancel Draft
          </button>
          <button
            type="submit"
            disabled={isLoading || isOcrLoading}
            className="flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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



import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, ScanLine, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import expenseService from '../../services/expenseService';
import notificationService from '../../services/notificationService';
import PageHeader from '../../components/ui/PageHeader';

const DEFAULT_EXTRACTED_DATA = {
  amount: '',
  date: new Date().toISOString().split('T')[0],
  category: '',
  description: '',
  currency: 'USD',
};

const WORKFLOW_STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'processing', label: 'Processing' },
  { key: 'complete', label: 'Auto-filled form' },
];

const ScanReceipt = () => {
  const navigate = useNavigate();
  const [workflowStep, setWorkflowStep] = useState('upload');
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(DEFAULT_EXTRACTED_DATA);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const activeStepIndex = useMemo(() => (
    WORKFLOW_STEPS.findIndex((step) => step.key === workflowStep)
  ), [workflowStep]);

  const handleFileSelection = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notificationService.error('Please upload an image file only.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setReceiptFile(file);
    setPreviewUrl(objectUrl);
    setWorkflowStep('upload');
    setExtractedData(DEFAULT_EXTRACTED_DATA);
  };

  const handleInputFileChange = (event) => {
    const file = event.target.files?.[0];
    handleFileSelection(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    handleFileSelection(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleScanReceipt = async () => {
    if (!receiptFile) {
      notificationService.error('Upload a receipt image first.');
      return;
    }

    setIsProcessing(true);
    setWorkflowStep('processing');
    const toastId = notificationService.loading('Scanning receipt...');

    try {
      const extracted = await expenseService.simulateOCRScan(receiptFile);
      setExtractedData({
        amount: extracted.amount || '',
        date: extracted.date || DEFAULT_EXTRACTED_DATA.date,
        category: extracted.category || '',
        description: extracted.description || '',
        currency: extracted.currency || 'USD',
      });
      setWorkflowStep('complete');
      notificationService.success('Receipt processed and fields auto-filled.', { id: toastId });
    } catch {
      setWorkflowStep('upload');
      notificationService.error('OCR processing failed. Please try again.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractedChange = (event) => {
    const { name, value } = event.target;
    setExtractedData((prev) => ({ ...prev, [name]: value }));
  };

  const continueToSubmit = () => {
    navigate('/expenses/new', {
      state: {
        prefillExpense: {
          amount: extractedData.amount || '',
          date: extractedData.date || DEFAULT_EXTRACTED_DATA.date,
          category: extractedData.category || '',
          description: extractedData.description || '',
          currency: extractedData.currency || 'USD',
        },
      },
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      <PageHeader
        title="Scan Receipt"
        description="Upload receipt image, process OCR, and edit auto-filled fields before submission."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {WORKFLOW_STEPS.map((step, index) => {
            const isActive = activeStepIndex === index;
            const isDone = activeStepIndex > index;
            const boxClass = isDone
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : isActive
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-slate-50 border-slate-200 text-slate-500';

            return (
              <React.Fragment key={step.key}>
                <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold sm:text-sm ${boxClass}`}>
                  {isDone ? <CheckCircle2 size={16} /> : <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">{index + 1}</span>}
                  {step.label}
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <span className="text-slate-400 text-xs sm:text-sm font-semibold">{'->'}</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">1. Upload Image</h2>
          <p className="mt-1 text-sm text-slate-500">Drag and drop or browse a receipt image.</p>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              previewUrl ? 'border-primary/30 bg-primary/5' : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
            }`}
          >
            {!previewUrl ? (
              <div className="flex flex-col items-center">
                <UploadCloud size={40} className="text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Drop receipt image here or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-500">Supported formats: JPG, PNG, WEBP</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleInputFileChange}
                  className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-primary-dark"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img src={previewUrl} alt="Receipt preview" className="max-h-96 w-full object-contain" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
                    <ImageIcon size={16} />
                    Replace image
                    <input type="file" accept="image/*" onChange={handleInputFileChange} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleScanReceipt}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
                    {isProcessing ? 'Processing...' : 'Start Scan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">2. Auto-filled Fields Preview</h2>
            <p className="mt-1 text-sm text-slate-500">OCR output generated from uploaded receipt image.</p>

            {workflowStep === 'processing' ? (
              <div className="mt-5 flex min-h-36 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                <Loader2 size={28} className="animate-spin" />
                <p className="mt-2 text-sm font-medium">Analyzing receipt and extracting values...</p>
              </div>
            ) : workflowStep === 'complete' ? (
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm"><span className="font-semibold text-slate-700">Amount:</span> {extractedData.amount || '-'}</p>
                <p className="text-sm"><span className="font-semibold text-slate-700">Date:</span> {extractedData.date || '-'}</p>
                <p className="text-sm"><span className="font-semibold text-slate-700">Category:</span> {extractedData.category || '-'}</p>
                <p className="text-sm"><span className="font-semibold text-slate-700">Currency:</span> {extractedData.currency || '-'}</p>
                <p className="text-sm"><span className="font-semibold text-slate-700">Description:</span> {extractedData.description || '-'}</p>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Upload and scan a receipt to generate auto-filled fields.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">3. Editable Extracted Data</h2>
            <p className="mt-1 text-sm text-slate-500">Review and edit values before using them in expense submission.</p>

            <form className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="amount" className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={extractedData.amount}
                  onChange={handleExtractedChange}
                  disabled={workflowStep !== 'complete'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div>
                <label htmlFor="currency" className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={extractedData.currency}
                  onChange={handleExtractedChange}
                  disabled={workflowStep !== 'complete'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>

              <div>
                <label htmlFor="date" className="mb-1 block text-sm font-medium text-slate-700">Date</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={extractedData.date}
                  onChange={handleExtractedChange}
                  disabled={workflowStep !== 'complete'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div>
                <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select
                  id="category"
                  name="category"
                  value={extractedData.category}
                  onChange={handleExtractedChange}
                  disabled={workflowStep !== 'complete'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Select category...</option>
                  <option value="Travel">Travel</option>
                  <option value="Meals">Meals</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Software">Software</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  value={extractedData.description}
                  onChange={handleExtractedChange}
                  disabled={workflowStep !== 'complete'}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </form>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={continueToSubmit}
                disabled={workflowStep !== 'complete'}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue To Submit Expense
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ScanReceipt;

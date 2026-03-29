import apiClient from './apiClient';
import loadingService from './loadingService';
import { convertCurrencyAmount } from './currencyService';

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD'];
let restCountriesCache = null;

async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRestCountries() {
  if (restCountriesCache) return restCountriesCache;
  const response = await fetchWithTimeout('https://restcountries.com/v3.1/all?fields=name,currencies,cca2', 12000);
  if (!response.ok) throw new Error('Unable to fetch country currency data.');
  restCountriesCache = await response.json();
  return restCountriesCache;
}

function parseRegionFromLanguage() {
  const lang = navigator.language || '';
  const parts = lang.split('-');
  return (parts[1] || '').toUpperCase() || null;
}

function getGeoPosition(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: timeoutMs,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

async function reverseGeocodeCountry(lat, lon) {
  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
    10000,
  );
  if (!response.ok) return null;
  const data = await response.json();
  return {
    countryCode: data?.address?.country_code?.toUpperCase() || null,
    countryName: data?.address?.country || null,
  };
}

async function resolveCurrencyFromCountryCode(countryCode) {
  if (!countryCode) return null;
  const countries = await fetchRestCountries();
  const entry = countries.find((c) => c.cca2 === countryCode);
  if (!entry?.currencies) return null;
  const code = Object.keys(entry.currencies)[0];
  return code || null;
}

async function detectDeviceCurrencyContext() {
  let countryCode = parseRegionFromLanguage();
  let countryName = null;

  try {
    const pos = await getGeoPosition();
    const geo = await reverseGeocodeCountry(pos.coords.latitude, pos.coords.longitude);
    if (geo?.countryCode) {
      countryCode = geo.countryCode;
      countryName = geo.countryName;
    }
  } catch {
    // Fallback to navigator.language region only.
  }

  const currency = (await resolveCurrencyFromCountryCode(countryCode)) || 'USD';
  return { countryCode, countryName, currency };
}

let mockPendingApprovals = [
  { id: 'REQ-9901', employeeName: 'Sarah Jenkins', date: '2026-04-02', category: 'Software', description: 'Figma Annual Organization License', amount: 540.00, currency: 'USD', approvalStep: 'Step 1 of 2: Manager Review' },
  { id: 'REQ-9902', employeeName: 'Marcus Reynolds', date: '2026-04-03', category: 'Travel', description: 'Client meeting flights (LHR)', amount: 1250.00, currency: 'GBP', approvalStep: 'Step 2 of 2: Finance Review' },
  { id: 'REQ-9903', employeeName: 'Elena Rostova', date: '2026-04-04', category: 'Hardware', description: 'Replacement Macbook Pro Battery', amount: 189.99, currency: 'EUR', approvalStep: 'Step 1 of 2: Manager Review' },
  { id: 'REQ-9904', employeeName: 'David Chen', date: '2026-03-31', category: 'Meals', description: 'Q1 Sales Team Celebration Dinner', amount: 840.50, currency: 'USD', approvalStep: 'Step 1 of 2: Manager Review' },
  { id: 'REQ-9905', employeeName: 'Aisha Patel', date: '2026-04-01', category: 'Travel', description: 'Train fare to regional HQ', amount: 45.00, currency: 'GBP', approvalStep: 'Step 1 of 2: Manager Review' },
];

const expenseService = {
  /**
   * Fetch all expenses tied to the current user
   */
  getExpenses: async () => {
    return loadingService.withGlobalLoading(async () => {
      const { data } = await apiClient.get('/expenses');
      return data.expenses || [];
    });
  },

  exportExpensesCsv: (expenses) => {
    if (!Array.isArray(expenses) || expenses.length === 0) {
      throw new Error('There are no expenses to export.');
    }

    const escapeCsvValue = (value) => {
      const normalized = value == null ? '' : String(value);
      if (/[",\n]/.test(normalized)) {
        return `"${normalized.replace(/"/g, '""')}"`;
      }
      return normalized;
    };

    const headers = [
      'Transaction ID',
      'Date',
      'Category',
      'Description',
      'Amount',
      'Currency',
      'Status',
      'Receipt File Name',
    ];

    const rows = expenses.map((expense) => ([
      expense.id,
      expense.date,
      expense.category,
      expense.description,
      expense.amount,
      expense.currency,
      expense.status,
      expense.receiptFileName || '',
    ]));

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    const fileBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const fileUrl = URL.createObjectURL(fileBlob);
    const downloadLink = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);

    downloadLink.href = fileUrl;
    downloadLink.download = `expense-history-${timestamp}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(fileUrl);

    return true;
  },

  viewExpenseDocument: async (expenseId) => {
    return loadingService.withGlobalLoading(async () => {
      const response = await apiClient.get(`/expenses/${expenseId}/document`, {
        responseType: 'blob',
      });

      const mimeType = response.headers['content-type'] || 'application/octet-stream';
      const fileBlob = new Blob([response.data], { type: mimeType });
      const fileUrl = URL.createObjectURL(fileBlob);
      const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');

      if (!newWindow) {
        URL.revokeObjectURL(fileUrl);
        throw new Error('Unable to open the document. Please allow pop-ups and try again.');
      }

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
      return true;
    });
  },

  /**
   * Submit a new expense record
   * @param {Object} formData
   */
  submitExpense: async (formData) => {
    return loadingService.withGlobalLoading(async () => {
      const payload = new FormData();
      payload.append('date', formData.date);
      payload.append('category', formData.category);
      payload.append('amount', String(formData.amount));
      payload.append('currency', formData.currency);
      payload.append('description', formData.description);
      payload.append('bill', formData.file);

      const { data } = await apiClient.post('/expenses', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data.expense;
    });
  },

  extractExpenseFromReceipt: async (file) => {
    return loadingService.withGlobalLoading(async () => {
      if (!file) {
        throw new Error('Please upload a receipt file before extraction.');
      }
      const payload = new FormData();
      payload.append('bill', file);
      const run = () => apiClient.post('/expenses/extract', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000,
      });

      try {
        const { data } = await run();
        return data;
      } catch (firstErr) {
        const status = firstErr?.response?.status;
        const transient =
          firstErr?.code === 'ECONNABORTED'
          || firstErr?.code === 'ERR_NETWORK'
          || !status
          || status >= 500;
        if (!transient) {
          const backendMessage = firstErr?.response?.data?.message;
          throw new Error(backendMessage || firstErr?.message || 'Extraction failed.');
        }
        try {
          const { data } = await run();
          return data;
        } catch (err) {
          const backendMessage = err?.response?.data?.message;
          if (backendMessage) {
            throw new Error(backendMessage);
          }
          if (err?.code === 'ECONNABORTED') {
            throw new Error('Extraction timed out. Please try a smaller/clearer image or retry.');
          }
          if (err?.message) {
            throw new Error(`Extraction failed: ${err.message}`);
          }
          throw new Error('Extraction failed due to a network or server error.');
        }
      }
    });
  },

  detectDeviceCurrencyContext,
  convertCurrencyAmount,
  getSupportedCurrencies: () => COMMON_CURRENCIES.slice(),

  simulateOCRScan: async (file) => {
    const data = await expenseService.extractExpenseFromReceipt(file);
    const suggestion = data?.suggestedExpense || {};
    return {
      amount: suggestion.amount != null ? String(suggestion.amount) : '',
      date: suggestion.date || new Date().toISOString().split('T')[0],
      category: suggestion.category || '',
      description: suggestion.description || '',
      currency: suggestion.currency || 'USD',
    };
  },

  /**
   * Fetch all team requests currently relying on the current Manager's approval
   */
  getPendingApprovals: async () => {
    return loadingService.withGlobalLoading(async () => {
      // Artificial 1 second network delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      return [...mockPendingApprovals];
    });
  },

  /**
   * Action a team member's expense
   * @param {string} id - The Request ID
   * @param {string} action - 'Approved' | 'Rejected'
   * @param {string} comment - Mandatory for rejection, optional for approval
   */
  resolveApproval: async (id, action) => {
    return loadingService.withGlobalLoading(async () => {
      // Simulate API resolving latency
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulate visually removing it from our active local memory so the UI updates natively!
      mockPendingApprovals = mockPendingApprovals.filter(req => req.id !== id);
      
      return { success: true, message: `Request ${id} successfully ${action.toLowerCase()}.` };
    });
  }
}

export default expenseService;

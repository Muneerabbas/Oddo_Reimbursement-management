import apiClient from './apiClient';
import loadingService from './loadingService';

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
      try {
        const { data } = await apiClient.post('/expenses/extract', payload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return data;
      } catch (err) {
        const backendMessage = err?.response?.data?.message;
        if (backendMessage) {
          throw new Error(backendMessage);
        }
        if (err?.message) {
          throw new Error(`Extraction failed: ${err.message}`);
        }
        throw new Error('Extraction failed due to a network or server error.');
      }
    });
  },

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
      const { data } = await apiClient.get('/expenses/approvals/pending');
      return data.approvals || [];
    });
  },

  /**
   * Action a team member's expense
   * @param {string} id - The Request ID
   * @param {string} action - 'Approved' | 'Rejected'
   * @param {string} comment - Mandatory for rejection, optional for approval
   */
  resolveApproval: async (id, action, comment = '') => {
    return loadingService.withGlobalLoading(async () => {
      const normalizedAction = String(action || '').trim().toLowerCase();
      if (normalizedAction !== 'approved' && normalizedAction !== 'rejected') {
        throw new Error('Invalid approval action.');
      }

      const { data } = await apiClient.patch(`/expenses/${id}/approval`, {
        action: normalizedAction,
        comment: comment || '',
      });

      return data;
    });
  }
}

export default expenseService;

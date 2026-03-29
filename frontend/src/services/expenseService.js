import apiClient from './apiClient';
import loadingService from './loadingService';

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

  /**
   * Mock functionality for an impending OCR backend model integration
   * Extracts generic values from a file upload mimicking AI processing
   * @param {File} file 
   */
  simulateOCRScan: async () => {
    return loadingService.withGlobalLoading(async () => {
      // Simulate a heavier ML processing latency
      await new Promise((resolve) => setTimeout(resolve, 2500));
      
      // Return dummy data struct that the UI form will consume to auto-fill
      return {
         amount: '142.50',
         date: new Date().toISOString().split('T')[0],
         category: 'Meals',
         description: 'Automated Extraction from Receipt scan',
         currency: 'USD'
      };
    });
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

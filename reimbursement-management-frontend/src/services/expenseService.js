/**
 * Mock Service layer for Expenses
 * Currently bypassing backend dependencies with hardcoded delays and arrays
 */

const mockExpenses = [
  { id: 'EXP-1049', date: '2026-03-25', category: 'Travel', description: 'Roundtrip flight to Tech Conference', amount: 540.00, status: 'Approved' },
  { id: 'EXP-1050', date: '2026-03-26', category: 'Meals', description: 'Client Dinner at StackHouse', amount: 125.50, status: 'Pending' },
  { id: 'EXP-1051', date: '2026-03-27', category: 'Supplies', description: 'Ergonomic Keyboard', amount: 95.00, status: 'Rejected' },
  { id: 'EXP-1052', date: '2026-03-28', category: 'Software', description: 'Annual Cloud Subscription', amount: 1499.00, status: 'Pending' },
  { id: 'EXP-1053', date: '2026-03-15', category: 'Hardware', description: 'New 4K Monitor for Home Office', amount: 450.00, status: 'Approved' },
  { id: 'EXP-1054', date: '2026-03-18', category: 'Travel', description: 'Uber to Airport', amount: 65.20, status: 'Approved' },
  { id: 'EXP-1055', date: '2026-03-19', category: 'Meals', description: 'Team Lunch - Regional Meetup', amount: 210.00, status: 'Pending' },
  { id: 'EXP-1056', date: '2026-03-20', category: 'Supplies', description: 'Printer Ink Cartridges', amount: 120.00, status: 'Approved' },
  { id: 'EXP-1057', date: '2026-03-21', category: 'Other', description: 'Conference Floor Pass', amount: 899.00, status: 'Approved' },
  { id: 'EXP-1058', date: '2026-03-22', category: 'Travel', description: 'Hotel 3-Night Stay', amount: 980.00, status: 'Pending' },
  { id: 'EXP-1059', date: '2026-03-23', category: 'Meals', description: 'Airport Starbucks', amount: 18.50, status: 'Rejected' },
  { id: 'EXP-1060', date: '2026-03-24', category: 'Software', description: 'Design Tool Monthly Seat', amount: 49.99, status: 'Approved' },
  { id: 'EXP-1061', date: '2026-04-01', category: 'Travel', description: 'Rental Car - 4 Days', amount: 350.00, status: 'Pending' }
];

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
    // Artificial 1 second network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return [...mockExpenses];
  },

  /**
   * Submit a new expense record
   * @param {Object} formData 
   */
  submitExpense: async (formData) => {
    // Artificial 1.5 second formulation network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Simulate generic error chance or generic success
    // In our case, we will permanently succeed so the UI redirects properly
    
    const newExpense = {
      id: `EXP-${Math.floor(Math.random() * 9000) + 1000}`,
      date: formData.date || new Date().toISOString().split('T')[0],
      category: formData.category || 'Other',
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: formData.currency || 'USD',
      status: 'Pending'
    };

    // Push into our active memory array for this session
    mockExpenses.unshift(newExpense);

    return newExpense;
  },

  /**
   * Mock functionality for an impending OCR backend model integration
   * Extracts generic values from a file upload mimicking AI processing
   * @param {File} file 
   */
  simulateOCRScan: async (file) => {
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
  },

  /**
   * Fetch all team requests currently relying on the current Manager's approval
   */
  getPendingApprovals: async () => {
    // Artificial 1 second network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [...mockPendingApprovals];
  },

  /**
   * Action a team member's expense
   * @param {string} id - The Request ID
   * @param {string} action - 'Approved' | 'Rejected'
   * @param {string} comment - Mandatory for rejection, optional for approval
   */
  resolveApproval: async (id, action, comment) => {
    // Simulate API resolving latency
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Simulate visually removing it from our active local memory so the UI updates natively!
    mockPendingApprovals = mockPendingApprovals.filter(req => req.id !== id);
    
    return { success: true, message: `Request ${id} successfully ${action.toLowerCase()}.` };
  }
}

export default expenseService;

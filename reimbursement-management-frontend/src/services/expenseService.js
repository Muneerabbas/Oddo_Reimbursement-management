/**
 * Mock Service layer for Expenses
 * Currently bypassing backend dependencies with hardcoded delays and arrays
 */

const mockExpenses = [
  {
    id: 'EXP-1049',
    date: '2026-03-25',
    category: 'Travel',
    description: 'Roundtrip flight to Tech Conference',
    amount: 540.00,
    status: 'Approved',
  },
  {
    id: 'EXP-1050',
    date: '2026-03-26',
    category: 'Meals',
    description: 'Client Dinner at StackHouse',
    amount: 125.50,
    status: 'Pending',
  },
  {
    id: 'EXP-1051',
    date: '2026-03-27',
    category: 'Supplies',
    description: 'Ergonomic Keyboard',
    amount: 95.00,
    status: 'Rejected',
  },
  {
    id: 'EXP-1052',
    date: '2026-03-28',
    category: 'Software',
    description: 'Annual Cloud Subscription',
    amount: 1499.00,
    status: 'Pending',
  }
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
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      status: 'Pending'
    };

    // Push into our active memory array for this session
    mockExpenses.unshift(newExpense);

    return newExpense;
  }
}

export default expenseService;

import loadingService from './loadingService';

/**
 * Dashboard Service handling aggregate statistics
 */
const dashboardService = {
  /**
   * Fetch aggregate statistics for the user's dashboard view.
   * Currently mocked to bypass the missing backend implementation.
   */
  getDashboardStats: async () => {
    return loadingService.withGlobalLoading(async () => {
      // In a real application we would call:
      // const response = await apiClient.get('/dashboard/stats');
      // return response.data;

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Simulated API response shape
      return {
        totalSubmitted: 24,
        pendingApprovals: 6,
        approvedAmount: 4320.50, // Stored as numeric cleanly
        rejectedCount: 2,
        recentActivity: [
          { id: 'EXP-1045', date: '2026-03-28T09:12:00Z', category: 'Software', description: 'GitHub Copilot Annual', amount: 120, currency: 'USD', status: 'Pending' },
          { id: 'EXP-1044', date: '2026-03-25T14:30:00Z', category: 'Travel', description: 'Uber to Airport', amount: 45.50, currency: 'USD', status: 'Approved' },
          { id: 'EXP-1043', date: '2026-03-24T18:00:00Z', category: 'Meals', description: 'Client Dinner with XYZ Corp', amount: 154.00, currency: 'USD', status: 'Rejected' },
          { id: 'EXP-1042', date: '2026-03-20T10:15:00Z', category: 'Office Supplies', description: 'Ergonomic Keyboard', amount: 199.99, currency: 'USD', status: 'Approved' },
          { id: 'EXP-1041', date: '2026-03-18T11:45:00Z', category: 'Travel', description: 'Flight to NYC Conference', amount: 450.00, currency: 'USD', status: 'Approved' },
        ],
        categoryBreakdown: [
          { name: 'Travel', value: 2450.00, color: 'bg-primary' },
          { name: 'Software', value: 850.50, color: 'bg-emerald-500' },
          { name: 'Meals', value: 640.00, color: 'bg-amber-500' },
          { name: 'Office Supplies', value: 380.00, color: 'bg-purple-500' },
        ]
      };
    });
  },
};

export default dashboardService;

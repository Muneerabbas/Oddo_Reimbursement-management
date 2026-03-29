import apiClient from './apiClient';

/**
 * Dashboard Service handling aggregate statistics
 */
const dashboardService = {
  /**
   * Fetch aggregate statistics for the user's dashboard view.
   * Currently mocked to bypass the missing backend implementation.
   */
  getDashboardStats: async () => {
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
    };
  },
};

export default dashboardService;

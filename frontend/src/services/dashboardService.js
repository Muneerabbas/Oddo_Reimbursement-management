import expenseService from './expenseService';

const CATEGORY_COLORS = [
  'bg-primary',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
];

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const toNumericAmount = (amount) => {
  const parsed = Number(amount ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getEventDate = (expense) => {
  const value = expense?.createdAt || expense?.date;
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toMonthKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}`;

const buildMonthlyTotals = (expenses) => {
  const totals = new Map();
  for (const item of expenses) {
    const date = getEventDate(item);
    const key = toMonthKey(date);
    totals.set(key, (totals.get(key) || 0) + toNumericAmount(item.amount));
  }
  return totals;
};

const dashboardService = {
  getDashboardStats: async () => {
    const expenses = await expenseService.getExpenses();
    const sortedExpenses = [...expenses].sort(
      (a, b) => getEventDate(b).getTime() - getEventDate(a).getTime(),
    );

    let pendingCount = 0;
    let rejectedCount = 0;
    let approvedAmount = 0;
    let pendingAmount = 0;
    let rejectedAmount = 0;
    const categoryTotals = new Map();

    for (const item of sortedExpenses) {
      const amount = toNumericAmount(item.amount);
      const status = normalizeStatus(item.status);
      const category = item.category || 'Other';

      if (status === 'pending') pendingCount += 1;
      if (status === 'rejected') rejectedCount += 1;
      if (status === 'approved' || status === 'paid') approvedAmount += amount;
      if (status === 'pending') pendingAmount += amount;
      if (status === 'rejected') rejectedAmount += amount;

      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
    }

    const categoryBreakdown = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name,
        value,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));

    const monthlyTotals = buildMonthlyTotals(sortedExpenses);
    const now = new Date();
    const currentMonthKey = toMonthKey(now);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthKey = toMonthKey(prevMonthDate);
    const currentMonthAmount = monthlyTotals.get(currentMonthKey) || 0;
    const previousMonthAmount = monthlyTotals.get(previousMonthKey) || 0;
    const monthOverMonthDelta = currentMonthAmount - previousMonthAmount;
    const monthOverMonthDeltaPercent = previousMonthAmount > 0
      ? Math.round((monthOverMonthDelta / previousMonthAmount) * 100)
      : null;

    const totalAmount = sortedExpenses.reduce((sum, item) => sum + toNumericAmount(item.amount), 0);
    const averageClaimAmount = sortedExpenses.length > 0 ? totalAmount / sortedExpenses.length : 0;

    return {
      totalSubmitted: sortedExpenses.length,
      pendingApprovals: pendingCount,
      approvedAmount,
      rejectedCount,
      recentActivity: sortedExpenses.slice(0, 20),
      categoryBreakdown,
      insights: {
        totalAmount,
        averageClaimAmount,
        pendingAmount,
        rejectedAmount,
        currentMonthAmount,
        previousMonthAmount,
        monthOverMonthDelta,
        monthOverMonthDeltaPercent,
        mostRecentExpenseDate:
          sortedExpenses.length > 0 ? getEventDate(sortedExpenses[0]).toISOString() : null,
      },
      statusSummary: {
        approved: sortedExpenses.filter((item) => {
          const status = normalizeStatus(item.status);
          return status === 'approved' || status === 'paid';
        }).length,
        pending: pendingCount,
        rejected: rejectedCount,
      },
      lastUpdatedAt: new Date().toISOString(),
    };
  },
};

export default dashboardService;

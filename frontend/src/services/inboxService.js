import expenseService from './expenseService';

const STORAGE_PREFIX = 'reimburse_notifications';

const getStorageKey = (userId) => `${STORAGE_PREFIX}:${userId || 'anonymous'}`;

const readSnapshot = (userId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return { seenIds: [] };
    const parsed = JSON.parse(raw);
    return {
      seenIds: Array.isArray(parsed.seenIds) ? parsed.seenIds : [],
    };
  } catch {
    return { seenIds: [] };
  }
};

const writeSnapshot = (userId, snapshot) => {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(snapshot));
};

const mkId = (kind, ref) => `${kind}:${ref}`;

const asTs = (value) => {
  const t = value ? new Date(value).getTime() : Date.now();
  return Number.isFinite(t) ? t : Date.now();
};

const statusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'danger';
  if (s === 'pending') return 'warning';
  return 'info';
};

const buildExpenseNotifications = (expenses = []) =>
  expenses
    .filter((e) => String(e.status || '').toLowerCase() !== 'pending')
    .map((e) => ({
      id: mkId('expense_status', e.id),
      type: 'expense_status',
      tone: statusTone(e.status),
      title: `Expense ${e.status}`,
      message: `${e.id}: ${e.category} ${e.amount} ${e.currency}`,
      ts: asTs(e.createdAt || e.date),
      refId: e.id,
      href: '/expenses',
    }));

const buildApprovalNotifications = (requests = []) =>
  requests.map((r) => ({
    id: mkId('approval_inbox', r.id),
    type: 'approval_inbox',
    tone: 'warning',
    title: 'Approval request waiting',
    message: `${r.id}: ${r.employeeName} · ${r.category} · ${r.amount} ${r.currency}`,
    ts: asTs(r.date),
    refId: r.id,
    href: '/approvals',
  }));

const inboxService = {
  async fetchNotifications(role) {
    const tasks = [];

    tasks.push(
      expenseService
        .getExpenses()
        .then((expenses) => buildExpenseNotifications(expenses))
        .catch(() => []),
    );

    if (role === 'manager' || role === 'admin') {
      tasks.push(
        expenseService
          .getPendingApprovals()
          .then((items) => buildApprovalNotifications(items))
          .catch(() => []),
      );
    }

    const parts = await Promise.all(tasks);
    return parts
      .flat()
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 50);
  },

  getUnreadCount(userId, notifications) {
    const snapshot = readSnapshot(userId);
    const seen = new Set(snapshot.seenIds);
    return notifications.filter((n) => !seen.has(n.id)).length;
  },

  markAllRead(userId, notifications) {
    writeSnapshot(userId, { seenIds: notifications.map((n) => n.id) });
  },

  markRead(userId, notificationId) {
    const snapshot = readSnapshot(userId);
    const seen = new Set(snapshot.seenIds);
    seen.add(notificationId);
    writeSnapshot(userId, { seenIds: Array.from(seen) });
  },
};

export default inboxService;

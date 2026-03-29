const NETWORK_DELAY_MS = 650;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let mockUsers = [
  {
    id: 'USR-1001',
    name: 'Demo Admin',
    email: 'admin@oddo.com',
    role: 'admin',
    managerId: null,
  },
  {
    id: 'USR-2001',
    name: 'Ariana Blake',
    email: 'ariana.blake@oddo.com',
    role: 'manager',
    managerId: null,
  },
  {
    id: 'USR-2002',
    name: 'Daniel Holt',
    email: 'daniel.holt@oddo.com',
    role: 'manager',
    managerId: null,
  },
  {
    id: 'USR-3001',
    name: 'Mia Turner',
    email: 'mia.turner@oddo.com',
    role: 'employee',
    managerId: 'USR-2001',
  },
  {
    id: 'USR-3002',
    name: 'Noah Singh',
    email: 'noah.singh@oddo.com',
    role: 'employee',
    managerId: 'USR-2002',
  },
];

const resolveManagerName = (managerId, users) => {
  if (!managerId) return 'Unassigned';
  const managerRecord = users.find((entry) => entry.id === managerId);
  return managerRecord?.name || 'Unassigned';
};

const sanitizeRole = (role) => {
  if (role === 'admin' || role === 'manager' || role === 'employee') {
    return role;
  }
  return 'employee';
};

const toViewModel = (record, users) => ({
  ...record,
  managerName: resolveManagerName(record.managerId, users),
});

const assertUniqueEmail = (email, ignoreId = null) => {
  const normalizedEmail = email.trim().toLowerCase();
  const duplicate = mockUsers.find((entry) => (
    entry.email.toLowerCase() === normalizedEmail && entry.id !== ignoreId
  ));

  if (duplicate) {
    throw new Error('A user with this email already exists.');
  }
};

const userService = {
  listUsers: async () => {
    await wait(NETWORK_DELAY_MS);
    return mockUsers.map((record) => toViewModel(record, mockUsers));
  },

  createUser: async (payload) => {
    await wait(NETWORK_DELAY_MS);

    assertUniqueEmail(payload.email);

    const normalizedRole = sanitizeRole(payload.role);
    const nextNumericId = mockUsers.length + 3001;
    const createdRecord = {
      id: `USR-${nextNumericId}`,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      role: normalizedRole,
      managerId: payload.managerId || null,
    };

    mockUsers = [createdRecord, ...mockUsers];
    return toViewModel(createdRecord, mockUsers);
  },

  updateUser: async (userId, payload) => {
    await wait(NETWORK_DELAY_MS);

    const userIndex = mockUsers.findIndex((entry) => entry.id === userId);
    if (userIndex < 0) {
      throw new Error('User record was not found.');
    }

    assertUniqueEmail(payload.email, userId);

    const normalizedRole = sanitizeRole(payload.role);
    const managerId = payload.managerId || null;

    if (managerId === userId) {
      throw new Error('A user cannot be their own manager.');
    }

    const updatedRecord = {
      ...mockUsers[userIndex],
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      role: normalizedRole,
      managerId,
    };

    mockUsers[userIndex] = updatedRecord;
    return toViewModel(updatedRecord, mockUsers);
  },
};

export default userService;

import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, Pencil } from 'lucide-react';
import userService from '../../services/userService';
import UserForm from '../../components/forms/UserForm';
import notificationService from '../../services/notificationService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/feedback/EmptyState';
import { TableSkeleton } from '../../components/feedback/Skeleton';

const roleClassMap = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  manager: 'bg-amber-50 text-amber-700 border-amber-200',
  employee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const toRoleLabel = (role) => {
  if (!role) return 'Employee';
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    const records = await userService.listUsers();
    setUsers(records);
  };

  useEffect(() => {
    let cancelled = false;

    const initializePage = async () => {
      try {
        const records = await userService.listUsers();
        if (!cancelled) {
          setUsers(records);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          notificationService.error('Failed to load users.');
          setIsLoading(false);
        }
      }
    };

    initializePage();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return users.filter((user) => (
      user.name.toLowerCase().includes(normalizedQuery)
      || user.email.toLowerCase().includes(normalizedQuery)
      || user.role.toLowerCase().includes(normalizedQuery)
      || user.managerName.toLowerCase().includes(normalizedQuery)
    ));
  }, [users, searchQuery]);

  const managerOptions = useMemo(() => (
    users
      .filter((user) => user.role === 'manager' && user.id !== activeUser?.id)
      .map((manager) => ({ id: manager.id, name: manager.name }))
  ), [users, activeUser]);

  const openCreateModal = () => {
    setActiveUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setActiveUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setActiveUser(null);
    }
  };

  const handleSubmitUser = async (payload) => {
    setIsSubmitting(true);
    const toastId = notificationService.loading(activeUser ? 'Updating user...' : 'Creating user...');

    try {
      if (activeUser) {
        await userService.updateUser(activeUser.id, payload);
      } else {
        await userService.createUser(payload);
      }

      await fetchUsers();
      setIsModalOpen(false);
      setActiveUser(null);

      notificationService.success(activeUser ? 'User updated successfully.' : 'User created successfully.', {
        id: toastId,
      });
    } catch (error) {
      notificationService.error(error.message || 'Unable to save user details.', { id: toastId });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="User Management"
        description="Create employees or managers, assign roles, and map reporting relationships."
        actions={(
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            <UserPlus size={16} />
            Create User
          </button>
        )}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, email, role, manager..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try a different search keyword or create a new user."
            actionLabel="Create User"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Manager</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${roleClassMap[user.role] || roleClassMap.employee}`}>
                        {toRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.managerName}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <UserForm
          isOpen={isModalOpen}
          mode={activeUser ? 'edit' : 'create'}
          initialValues={activeUser}
          managers={managerOptions}
          isSubmitting={isSubmitting}
          onClose={closeModal}
          onSubmit={handleSubmitUser}
        />
      )}
    </div>
  );
};

export default Users;

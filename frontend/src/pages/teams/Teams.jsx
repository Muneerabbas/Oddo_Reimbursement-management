import React, { useCallback, useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import teamService from '../../services/teamService';
import { UsersRound, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';

const PERM_META = [
  { key: 'submitExpense', label: 'Submit expenses' },
  { key: 'viewOwnExpenses', label: 'View own expenses' },
  { key: 'viewApprovalStatus', label: 'View approval status' },
  { key: 'approveExpenses', label: 'Approve expenses' },
  { key: 'viewTeamExpenses', label: 'View team expenses' },
  { key: 'manageTeamRoles', label: 'Manage team roles' },
  { key: 'manageTeamMembers', label: 'Manage team members' },
  { key: 'configureApprovalFlow', label: 'Configure approval flows' },
];

function defaultPermissions(baseRole) {
  return {
    submitExpense: true,
    viewOwnExpenses: true,
    viewApprovalStatus: true,
    approveExpenses: baseRole === 'manager',
    viewTeamExpenses: baseRole === 'manager',
    manageTeamRoles: false,
    manageTeamMembers: false,
    configureApprovalFlow: false,
  };
}

const Teams = () => {
  const [tab, setTab] = useState('members');
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roleModal, setRoleModal] = useState(null);
  const [memberModal, setMemberModal] = useState(null);
  const [editMember, setEditMember] = useState(null);

  const [roleForm, setRoleForm] = useState({
    name: '',
    baseRole: 'employee',
    permissions: defaultPermissions('employee'),
  });

  const [memberForm, setMemberForm] = useState({
    fullName: '',
    email: '',
    password: '',
    companyRoleId: '',
    managerId: '',
  });

  const [editForm, setEditForm] = useState({ companyRoleId: '', managerId: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m, mgr] = await Promise.all([
        teamService.listRoles(),
        teamService.listMembers(),
        teamService.listManagers(),
      ]);
      setRoles(r);
      setMembers(m);
      setManagers(mgr);
    } catch (e) {
      toast.error(e.message || 'Failed to load teams data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateRole = () => {
    setRoleForm({
      name: '',
      baseRole: 'employee',
      permissions: defaultPermissions('employee'),
    });
    setRoleModal('create');
  };

  const openEditRole = (role) => {
    setRoleForm({
      name: role.name,
      baseRole: role.baseRole,
      permissions: { ...defaultPermissions(role.baseRole), ...role.permissions },
    });
    setRoleModal({ mode: 'edit', id: role.id });
  };

  const togglePerm = (key) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const submitRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      toast.error('Role name is required.');
      return;
    }
    try {
      if (roleModal === 'create') {
        await teamService.createRole({
          name: roleForm.name.trim(),
          baseRole: roleForm.baseRole,
          permissions: roleForm.permissions,
        });
        toast.success('Role created.');
      } else if (roleModal?.mode === 'edit') {
        await teamService.updateRole(roleModal.id, {
          name: roleForm.name.trim(),
          permissions: roleForm.permissions,
        });
        toast.success('Role updated.');
      }
      setRoleModal(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not save role.');
    }
  };

  const removeRole = async (role) => {
    if (!window.confirm(`Delete role “${role.name}”?`)) return;
    try {
      await teamService.deleteRole(role.id);
      toast.success('Role removed.');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not delete role.');
    }
  };

  const openCreateMember = () => {
    setMemberForm({
      fullName: '',
      email: '',
      password: '',
      companyRoleId: roles[0]?.id ?? '',
      managerId: '',
    });
    setMemberModal(true);
  };

  const selectedRoleForMember = roles.find((r) => r.id === Number(memberForm.companyRoleId));
  const needsManager = selectedRoleForMember?.baseRole === 'employee';

  const submitMember = async (e) => {
    e.preventDefault();
    if (memberForm.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    try {
      await teamService.createMember({
        fullName: memberForm.fullName.trim(),
        email: memberForm.email.trim(),
        password: memberForm.password,
        companyRoleId: Number(memberForm.companyRoleId),
        managerId: needsManager && memberForm.managerId ? Number(memberForm.managerId) : null,
      });
      toast.success('Team member added. They can sign in with this email and password.');
      setMemberModal(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not add member.');
    }
  };

  const openEditMember = (m) => {
    if (m.systemRole === 'admin') {
      toast.error('Organization admins are managed separately.');
      return;
    }
    setEditForm({
      companyRoleId: m.companyRole?.id ?? '',
      managerId: m.managerId ?? '',
    });
    setEditMember(m);
  };

  const submitEditMember = async (e) => {
    e.preventDefault();
    if (!editForm.companyRoleId) {
      toast.error('Select a team role.');
      return;
    }
    try {
      const payload = {
        companyRoleId: Number(editForm.companyRoleId),
      };
      const roleObj = roles.find((r) => r.id === Number(editForm.companyRoleId));
      if (roleObj?.baseRole === 'employee') {
        payload.managerId = editForm.managerId ? Number(editForm.managerId) : null;
      } else {
        payload.managerId = null;
      }
      await teamService.updateMember(editMember.id, payload);
      toast.success('Member updated.');
      setEditMember(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update member.');
    }
  };

  const removeMember = async (m) => {
    if (m.systemRole === 'admin') {
      toast.error('Cannot remove admins from this screen.');
      return;
    }
    if (!window.confirm(`Remove ${m.fullName} from the workspace?`)) return;
    try {
      await teamService.deleteMember(m.id);
      toast.success('Member removed.');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not remove member.');
    }
  };

  const baseTabBtn =
    'px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-transparent';
  const activeTab = 'bg-primary text-white shadow-sm';
  const inactiveTab = 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';

  if (loading && members.length === 0 && roles.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UsersRound className="text-primary" size={28} />
            Teams
          </h1>
          <p className="text-slate-600 mt-1 text-sm max-w-2xl">
            Define roles with permissions, then add people. Members sign in with their email and
            password. Default Employee and Manager roles are created when you register your company.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`${baseTabBtn} ${tab === 'members' ? activeTab : inactiveTab}`}
          onClick={() => setTab('members')}
        >
          Team members
        </button>
        <button
          type="button"
          className={`${baseTabBtn} ${tab === 'roles' ? activeTab : inactiveTab}`}
          onClick={() => setTab('roles')}
        >
          Roles & permissions
        </button>
      </div>

      {tab === 'roles' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Roles</h2>
            <button
              type="button"
              onClick={openCreateRole}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              <Plus size={18} />
              New role
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Base access</th>
                  <th className="px-4 py-3 font-medium">Permissions</th>
                  <th className="px-4 py-3 font-medium w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{role.name}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{role.baseRole}</td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="text-xs">
                        {PERM_META.filter((p) => role.permissions?.[p.key]).map((p) => p.label).join(' · ') ||
                          '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditRole(role)}
                          className="p-1.5 text-slate-500 hover:text-primary rounded-md hover:bg-slate-100"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRole(role)}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Members</h2>
            <button
              type="button"
              onClick={openCreateMember}
              disabled={roles.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              <Plus size={18} />
              Add member
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Team role</th>
                  <th className="px-4 py-3 font-medium">System</th>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{m.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{m.email}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.companyRole ? m.companyRole.name : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {m.systemRole === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          <ShieldCheck size={12} />
                          Admin
                        </span>
                      ) : (
                        <span className="capitalize text-slate-600">{m.systemRole}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.managerName || '—'}</td>
                    <td className="px-4 py-3">
                      {m.systemRole !== 'admin' ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEditMember(m)}
                            className="p-1.5 text-slate-500 hover:text-primary rounded-md hover:bg-slate-100"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMember(m)}
                            className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {roleModal === 'create' ? 'Create role' : 'Edit role'}
            </h3>
            <form onSubmit={submitRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role name</label>
                <input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>
              {roleModal === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base access level</label>
                  <select
                    value={roleForm.baseRole}
                    onChange={(e) => {
                      const br = e.target.value;
                      setRoleForm((p) => ({
                        ...p,
                        baseRole: br,
                        permissions: defaultPermissions(br),
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="employee">Employee (submit & own data)</option>
                    <option value="manager">Manager (+ approve & team view)</option>
                  </select>
                </div>
              )}
              {roleModal?.mode === 'edit' && (
                <p className="text-xs text-slate-500">
                  Base level is fixed for this role ({roleForm.baseRole}). Adjust capability toggles
                  below.
                </p>
              )}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Capabilities</p>
                <div className="grid grid-cols-1 gap-2">
                  {PERM_META.map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions[p.key]}
                        onChange={() => togglePerm(p.key)}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {memberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add team member</h3>
            <form onSubmit={submitMember} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                <input
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (login)</label>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Team role</label>
                <select
                  value={memberForm.companyRoleId}
                  onChange={(e) => setMemberForm((p) => ({ ...p, companyRoleId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.baseRole})
                    </option>
                  ))}
                </select>
              </div>
              {needsManager && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Line manager (optional)
                  </label>
                  <select
                    value={memberForm.managerId}
                    onChange={(e) => setMemberForm((p) => ({ ...p, managerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">— None —</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMemberModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  Add member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Edit member</h3>
            <p className="text-sm text-slate-500 mb-4">{editMember.fullName}</p>
            <form onSubmit={submitEditMember} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Team role</label>
                <select
                  value={editForm.companyRoleId}
                  onChange={(e) => setEditForm((p) => ({ ...p, companyRoleId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.baseRole})
                    </option>
                  ))}
                </select>
              </div>
              {roles.find((r) => r.id === Number(editForm.companyRoleId))?.baseRole === 'employee' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Line manager</label>
                  <select
                    value={editForm.managerId}
                    onChange={(e) => setEditForm((p) => ({ ...p, managerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">— None —</option>
                    {managers
                      .filter((mgr) => mgr.id !== editMember.id)
                      .map((mgr) => (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;

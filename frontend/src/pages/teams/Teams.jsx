import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import teamService from '../../services/teamService';
import { UsersRound, Plus, Pencil, Trash2, ShieldCheck, Settings2, GitBranch } from 'lucide-react';
const HierarchyAssign = lazy(() => import('../../components/teams/HierarchyAssign'));

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

function permissionSummary(role) {
  const labels = PERM_META.filter((p) => role.permissions?.[p.key]).map((p) => p.label);
  return labels.length ? labels.join(' · ') : '—';
}

const Teams = () => {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roleModal, setRoleModal] = useState(null);
  const [memberModal, setMemberModal] = useState(false);
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
  const [teamsView, setTeamsView] = useState('people');

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

  const adminMembers = useMemo(
    () => members.filter((m) => m.systemRole === 'admin'),
    [members],
  );

  const membersByRoleId = useMemo(() => {
    const map = new Map();
    roles.forEach((role) => map.set(role.id, []));
    members.forEach((m) => {
      if (m.systemRole === 'admin') return;
      const rid = m.companyRole?.id;
      if (rid != null && map.has(rid)) {
        map.get(rid).push(m);
      }
    });
    return map;
  }, [roles, members]);

  const roleIds = useMemo(() => new Set(roles.map((r) => r.id)), [roles]);

  const unassignedMembers = useMemo(
    () =>
      members.filter(
        (m) => m.systemRole !== 'admin' && (!m.companyRole || !roleIds.has(m.companyRole.id)),
      ),
    [members, roleIds],
  );

  const rolesOrdered = useMemo(() => {
    return [...roles].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [roles]);

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

  const openCreateMemberForRole = (role) => {
    setMemberForm({
      fullName: '',
      email: '',
      password: '',
      companyRoleId: String(role.id),
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

  const MemberRow = ({ m, showManagerCol }) => (
    <tr key={m.id} className="hover:bg-slate-50/80">
      <td className="px-4 py-3 font-medium text-slate-900">{m.fullName}</td>
      <td className="px-4 py-3 text-slate-600">{m.email}</td>
      {showManagerCol && (
        <td className="px-4 py-3 text-slate-500">{m.managerName || '—'}</td>
      )}
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => openEditMember(m)}
            className="p-1.5 text-slate-500 hover:text-primary rounded-md hover:bg-slate-100"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => removeMember(m)}
            className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50"
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  if (loading && members.length === 0 && roles.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UsersRound className="text-primary" size={28} />
          Teams
        </h1>
        <p className="text-slate-600 mt-1 text-sm max-w-2xl">
          Configure roles and rosters, or switch to <strong>Assign hierarchy</strong> for a live graph
          of reporting lines (bottom → top). Members sign in with email and password.
        </p>
        <div className="mt-6 inline-flex p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-inner gap-0.5">
          <button
            type="button"
            onClick={() => setTeamsView('people')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              teamsView === 'people'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            People &amp; roles
          </button>
          <button
            type="button"
            onClick={() => setTeamsView('assign')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 ${
              teamsView === 'assign'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitBranch size={16} aria-hidden />
            Assign hierarchy
          </button>
        </div>
      </div>

      {teamsView === 'assign' ? (
        <Suspense
          fallback={
            <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
            </div>
          }
        >
          <HierarchyAssign onRefresh={load} />
        </Suspense>
      ) : (
        <>
      {/* —— Role definitions: its own block (not mixed with member rows) —— */}
      <section className="space-y-3" aria-labelledby="role-definitions-heading">
        <div className="flex items-center gap-2 text-slate-800">
          <Settings2 size={20} className="text-slate-500" />
          <h2 id="role-definitions-heading" className="text-lg font-semibold">
            Role definitions
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Names, base access level, and permissions. This table is only for role setup—not for listing
          people.
        </p>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-end">
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
                  <th className="px-4 py-3 font-medium">Role name</th>
                  <th className="px-4 py-3 font-medium">Base access</th>
                  <th className="px-4 py-3 font-medium">Permissions</th>
                  <th className="px-4 py-3 font-medium w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rolesOrdered.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{role.name}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{role.baseRole}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{permissionSummary(role)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditRole(role)}
                          className="p-1.5 text-slate-500 hover:text-primary rounded-md hover:bg-slate-100"
                          title="Edit role"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRole(role)}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50"
                          title="Delete role"
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
      </section>

      {/* —— Administrators: separate table —— */}
      <section className="space-y-3" aria-labelledby="admins-heading">
        <h2 id="admins-heading" className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <ShieldCheck size={20} className="text-purple-600" />
          Administrators
        </h2>
        <p className="text-xs text-slate-500">Company admins (created at registration). Not editable here.</p>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminMembers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No administrators listed.
                    </td>
                  </tr>
                ) : (
                  adminMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{m.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">{m.email}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* —— One member table per role, stacked —— */}
      {rolesOrdered.map((role) => {
        const rows = membersByRoleId.get(role.id) ?? [];
        const showManager = role.baseRole === 'employee';
        return (
          <section key={role.id} className="space-y-3" aria-labelledby={`role-members-${role.id}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2
                  id={`role-members-${role.id}`}
                  className="text-lg font-semibold text-slate-800"
                >
                  {role.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">
                  Base: {role.baseRole} · {rows.length} member{rows.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCreateMemberForRole(role)}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark shrink-0"
              >
                <Plus size={18} />
                Add to this role
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      {showManager && <th className="px-4 py-3 font-medium">Line manager</th>}
                      <th className="px-4 py-3 font-medium w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={showManager ? 4 : 3}
                          className="px-4 py-8 text-center text-slate-400 text-sm"
                        >
                          No members in this role yet.
                        </td>
                      </tr>
                    ) : (
                      rows.map((m) => (
                        <MemberRow key={m.id} m={m} showManagerCol={showManager} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}

      {unassignedMembers.length > 0 && (
        <section className="space-y-3" aria-labelledby="unassigned-heading">
          <h2 id="unassigned-heading" className="text-lg font-semibold text-amber-800">
            Without a team role
          </h2>
          <p className="text-xs text-slate-500">
            These users are not admins and have no company role assigned. Assign a role via Edit.
          </p>
          <div className="bg-amber-50/50 rounded-xl border border-amber-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-amber-100/60 text-amber-900">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">System</th>
                    <th className="px-4 py-3 font-medium w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 bg-white">
                  {unassignedMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-amber-50/40">
                      <td className="px-4 py-3 font-medium text-slate-900">{m.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">{m.email}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{m.systemRole}</td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
        </>
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
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Add team member</h3>
            {selectedRoleForMember && (
              <p className="text-sm text-slate-500 mb-4">
                Role: <span className="font-medium text-slate-700">{selectedRoleForMember.name}</span>
              </p>
            )}
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

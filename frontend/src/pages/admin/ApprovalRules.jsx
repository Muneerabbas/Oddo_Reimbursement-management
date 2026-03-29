import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import StepBuilder from '../../components/admin/StepBuilder';
import approvalRuleService from '../../services/approvalRuleService';
import notificationService from '../../services/notificationService';
import PageHeader from '../../components/ui/PageHeader';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import teamService from '../../services/teamService';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';

const titleCase = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);

const getMemberRoleLabel = (member) => member.companyRole?.name || titleCase(member.systemRole || 'employee');
const getMemberDisplayLabel = (member) => `${member.fullName} - ${getMemberRoleLabel(member)}`;

const createEmptyStep = () => ({
  id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  mode: 'role_percentage',
  percentage: 100,
  roleIds: [],
  approverIds: [],
});

const createEmptyRule = () => ({
  id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  triggerMode: 'amount',
  maxAmount: '',
  employeeIds: [],
  steps: [createEmptyStep()],
});

const normalizeRule = (rule) => ({
  id: rule.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  triggerMode: rule.triggerMode === 'employee_specific' ? 'employee_specific' : 'amount',
  maxAmount: rule.maxAmount ?? '',
  employeeIds: Array.isArray(rule.employeeIds) ? rule.employeeIds : [],
  steps: Array.isArray(rule.steps) && rule.steps.length
    ? rule.steps.map((step) => ({
      id: step.id || `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode: step.mode || 'role_percentage',
      percentage: step.percentage ?? 100,
      roleIds: Array.isArray(step.roleIds) ? step.roleIds : [],
      approverIds: Array.isArray(step.approverIds) ? step.approverIds : [],
    }))
    : [createEmptyStep()],
});

const ApprovalRules = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rules, setRules] = useState([createEmptyRule()]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [approverOptions, setApproverOptions] = useState([]);
  const [memberOptions, setMemberOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const [config, roles, members] = await Promise.all([
          approvalRuleService.getApprovalRuleConfig(),
          teamService.listRoles(),
          teamService.listMembers(),
        ]);

        if (!cancelled) {
          const normalizedMembers = members.map((member) => ({
            id: member.id,
            name: member.fullName,
            label: getMemberDisplayLabel(member),
            description: getMemberRoleLabel(member),
          }));

          setRules(
            Array.isArray(config.rules) && config.rules.length
              ? config.rules.map(normalizeRule)
              : [createEmptyRule()],
          );
          setRoleOptions(
            roles.map((role) => ({
              id: role.id,
              name: role.name,
              label: role.name,
              description: `${titleCase(role.baseRole)} role`,
              baseRole: role.baseRole,
            })),
          );
          setApproverOptions(normalizedMembers);
          setMemberOptions(normalizedMembers);
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          notificationService.error(error.message || 'Failed to load approval rule configuration.');
          setIsLoading(false);
        }
      }
    };

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const isRuleValid = useMemo(() => {
    if (!rules.length) return false;

    return rules.every((rule) => {
      if (!Array.isArray(rule.steps) || !rule.steps.length) {
        return false;
      }

      if (rule.triggerMode === 'amount' && (!Number(rule.maxAmount) || Number(rule.maxAmount) <= 0)) {
        return false;
      }

      if (rule.triggerMode === 'employee_specific' && (!Array.isArray(rule.employeeIds) || !rule.employeeIds.length)) {
        return false;
      }

      return rule.steps.every((step) => {
        if (step.mode === 'role_percentage') {
          return Array.isArray(step.roleIds) && step.roleIds.length > 0
            && Number(step.percentage) >= 0
            && Number(step.percentage) <= 100;
        }

        return Array.isArray(step.approverIds) && step.approverIds.length > 0;
      });
    });
  }, [rules]);

  const previewCards = useMemo(() => {
    const roleLabelMap = new Map(roleOptions.map((role) => [role.id, role.label || role.name]));
    const approverLabelMap = new Map(approverOptions.map((approver) => [approver.id, approver.label || approver.name]));
    const memberLabelMap = new Map(memberOptions.map((member) => [member.id, member.label || member.name]));

    return rules.map((rule, index) => ({
      id: rule.id,
      title: `Rule ${index + 1}`,
      summary: rule.triggerMode === 'employee_specific'
        ? `Assigned directly to: ${(rule.employeeIds || []).map((id) => memberLabelMap.get(id) || `Employee #${id}`).join(', ')}`
        : `Applies up to Rs ${Number(rule.maxAmount) || 0}`,
      steps: rule.steps.map((step, stepIndex) => {
        if (step.mode === 'role_percentage') {
          const labels = (step.roleIds || []).map((id) => roleLabelMap.get(id) || `Role #${id}`);
          return `Step ${stepIndex + 1}: ${labels.join(', ')} at ${Number(step.percentage) || 0}%`;
        }

        const labels = (step.approverIds || []).map((id) => approverLabelMap.get(id) || `Approver #${id}`);
        return `Step ${stepIndex + 1}: ${labels.join(', ')}`;
      }),
    }));
  }, [approverOptions, memberOptions, roleOptions, rules]);

  const addRule = () => {
    setRules((prev) => [...prev, createEmptyRule()]);
  };

  const updateRule = (ruleId, updater) => {
    setRules((prev) => prev.map((rule) => (
      rule.id === ruleId ? updater(rule) : rule
    )));
  };

  const removeRule = (ruleId) => {
    setRules((prev) => (
      prev.length > 1 ? prev.filter((rule) => rule.id !== ruleId) : prev
    ));
  };

  const handleSave = async () => {
    if (!isRuleValid) {
      notificationService.error('Each rule needs a valid trigger and complete steps with either roles + percentage or named approvers.');
      return;
    }

    setIsSaving(true);
    const toastId = notificationService.loading('Saving approval rules...');

    try {
      await approvalRuleService.saveApprovalRuleConfig({
        rules: rules.map((rule) => ({
          id: rule.id,
          triggerMode: rule.triggerMode,
          maxAmount: rule.triggerMode === 'amount' ? Number(rule.maxAmount) : undefined,
          employeeIds: rule.triggerMode === 'employee_specific' ? rule.employeeIds : [],
          steps: rule.steps.map((step) => ({
            id: step.id,
            mode: step.mode,
            percentage: step.mode === 'role_percentage' ? Number(step.percentage) : undefined,
            roleIds: step.mode === 'role_percentage' ? step.roleIds : [],
            approverIds: step.mode === 'specific_approver' ? step.approverIds : [],
          })),
        })),
      });
      notificationService.success('Approval rules updated successfully.', { id: toastId });
    } catch (error) {
      console.error(error);
      notificationService.error(error.message || 'Unable to save approval rules.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <TableSkeleton rows={6} columns={2} />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Expense Approval Rules"
        description="Create multiple approval rules. A rule can be amount-based or assigned directly to selected employees, and each rule can contain many approval steps."
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <Plus size={16} />
              Add Rule
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save size={16} />
              )}
              Save Rules
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {rules.map((rule, index) => (
            <div key={rule.id} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Rule {index + 1}</h2>
                  <p className="text-sm text-slate-500">
                    Choose whether this rule is triggered by an amount band or assigned directly to specific employees.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  disabled={rules.length <= 1}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Remove Rule
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Rule applies by
                  </label>
                  <select
                    value={rule.triggerMode}
                    onChange={(event) => updateRule(rule.id, (current) => ({
                      ...current,
                      triggerMode: event.target.value,
                      maxAmount: event.target.value === 'amount' ? current.maxAmount : '',
                      employeeIds: event.target.value === 'employee_specific' ? current.employeeIds : [],
                    }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="amount">Amount band</option>
                    <option value="employee_specific">Specific employee</option>
                  </select>
                </div>

                {rule.triggerMode === 'amount' ? (
                  <div className="max-w-xs">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Max amount this rule can approve
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                        Rs
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={rule.maxAmount}
                        onChange={(event) => updateRule(rule.id, (current) => ({
                          ...current,
                          maxAmount: event.target.value,
                        }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="1000"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <MultiSelectDropdown
                      label="Specific employees for this sequence"
                      placeholder="Select employees"
                      helperText="Choose the employees who should always use this approval chain."
                      options={memberOptions}
                      selectedValues={rule.employeeIds || []}
                      onToggle={(memberId) => updateRule(rule.id, (current) => {
                        const currentIds = Array.isArray(current.employeeIds) ? current.employeeIds : [];
                        const employeeIds = currentIds.includes(memberId)
                          ? currentIds.filter((id) => id !== memberId)
                          : [...currentIds, memberId];

                        return {
                          ...current,
                          employeeIds,
                        };
                      })}
                      emptyMessage="No employees available yet."
                    />
                  </div>
                )}
              </div>

              <StepBuilder
                steps={rule.steps}
                roleOptions={roleOptions}
                approverOptions={approverOptions}
                onChange={(nextSteps) => updateRule(rule.id, (current) => ({
                  ...current,
                  steps: nextSteps,
                }))}
                minSteps={1}
                maxSteps={8}
              />
            </div>
          ))}
        </div>

        <div className="h-fit rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Preview Summary</h2>
          <p className="mt-1 text-sm text-slate-600">
            Admin-defined amount bands or person-specific approval chains that will run when a request is created.
          </p>

          <div className="mt-5 space-y-4 text-sm text-slate-700">
            {previewCards.map((card) => (
              <div key={card.id} className="rounded-xl border border-primary/10 bg-white/70 p-4">
                <p className="font-semibold text-slate-800">{card.title}</p>
                <p className="mt-1 text-slate-600">{card.summary}</p>
                <div className="mt-3 space-y-1">
                  {card.steps.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalRules;

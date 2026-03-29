import React, { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ToggleLeft, ToggleRight, Save } from 'lucide-react';
import StepBuilder from '../../components/admin/StepBuilder';
import approvalRuleService from '../../services/approvalRuleService';

const APPROVER_OPTIONS = [
  { id: 'APR-101', name: 'Ariana Blake (Engineering Manager)' },
  { id: 'APR-102', name: 'Daniel Holt (Finance Manager)' },
  { id: 'APR-103', name: 'Priya Nair (Director Operations)' },
  { id: 'APR-104', name: 'Ruben Flores (CFO Delegate)' },
  { id: 'APR-105', name: 'Olivia Chen (HRBP)' },
];

const getApproverName = (approverId) => {
  const option = APPROVER_OPTIONS.find((entry) => entry.id === approverId);
  return option?.name || 'Unassigned';
};

const ApprovalRules = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [steps, setSteps] = useState([
    { id: 'step-1', approverId: 'APR-101' },
    { id: 'step-2', approverId: 'APR-102' },
    { id: 'step-3', approverId: 'APR-103' },
  ]);
  const [percentageThreshold, setPercentageThreshold] = useState(60);
  const [specificApproverId, setSpecificApproverId] = useState('APR-104');
  const [isHybridRuleEnabled, setIsHybridRuleEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const config = await approvalRuleService.getApprovalRuleConfig();
        if (!cancelled) {
          setSteps(config.steps || []);
          setPercentageThreshold(config.percentageThreshold ?? 60);
          setSpecificApproverId(config.specificApproverId || '');
          setIsHybridRuleEnabled(!!config.isHybridRuleEnabled);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          toast.error('Failed to load approval rule configuration.');
          setIsLoading(false);
        }
      }
    };

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewSequence = useMemo(() => (
    steps.map((step, index) => `Step ${index + 1}: ${getApproverName(step.approverId)}`)
  ), [steps]);

  const isRuleValid = useMemo(() => {
    if (!steps.length) return false;
    const allStepsAssigned = steps.every((step) => step.approverId);
    const validPercentage = Number(percentageThreshold) >= 0 && Number(percentageThreshold) <= 100;
    return allStepsAssigned && validPercentage;
  }, [steps, percentageThreshold]);

  const handleSave = async () => {
    if (!isRuleValid) {
      toast.error('Complete all step approvers and keep percentage between 0 and 100.');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Saving approval rules...');

    try {
      await approvalRuleService.saveApprovalRuleConfig({
        steps,
        percentageThreshold: Number(percentageThreshold),
        specificApproverId,
        isHybridRuleEnabled,
      });
      toast.success('Approval rules updated successfully.', { id: toastId });
    } catch {
      toast.error('Unable to save approval rules.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Approval Rule Configuration</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define approver sequence, percentage logic, and hybrid override behavior.
          </p>
        </div>

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

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Multi-level Approvers Sequence</h2>
        <StepBuilder
          steps={steps}
          approverOptions={APPROVER_OPTIONS}
          onChange={setSteps}
          minSteps={1}
          maxSteps={7}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-slate-800">Rule Inputs</h2>

          <div>
            <label htmlFor="percentageRule" className="mb-1 block text-sm font-medium text-slate-700">
              Percentage Rule Input
            </label>
            <div className="flex items-center gap-2">
              <input
                id="percentageRule"
                type="number"
                min="0"
                max="100"
                value={percentageThreshold}
                onChange={(event) => setPercentageThreshold(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <span className="text-sm font-semibold text-slate-500">%</span>
            </div>
          </div>

          <div>
            <label htmlFor="specificApprover" className="mb-1 block text-sm font-medium text-slate-700">
              Specific Approver Rule
            </label>
            <select
              id="specificApprover"
              value={specificApproverId}
              onChange={(event) => setSpecificApproverId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">No specific approver</option>
              {APPROVER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Hybrid Rule Toggle</p>
            <button
              type="button"
              onClick={() => setIsHybridRuleEnabled((prev) => !prev)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
            >
              {isHybridRuleEnabled ? (
                <>
                  <ToggleRight size={22} className="text-primary" />
                  Enabled
                </>
              ) : (
                <>
                  <ToggleLeft size={22} className="text-slate-400" />
                  Disabled
                </>
              )}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Rule Preview Summary</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-800">Approver Flow</p>
              <div className="mt-1 space-y-1">
                {previewSequence.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-800">Percentage Rule</p>
              <p className="mt-1">{Number(percentageThreshold) || 0}% threshold applied.</p>
            </div>

            <div>
              <p className="font-semibold text-slate-800">Specific Approver</p>
              <p className="mt-1">{specificApproverId ? getApproverName(specificApproverId) : 'No specific override selected.'}</p>
            </div>

            <div>
              <p className="font-semibold text-slate-800">Hybrid Mode</p>
              <p className="mt-1">
                {isHybridRuleEnabled
                  ? 'Enabled: sequence + percentage + specific approver rule can work together.'
                  : 'Disabled: only sequence and base rules are applied.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalRules;

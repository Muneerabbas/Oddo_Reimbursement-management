import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';

const STEP_MODE_OPTIONS = [
  { value: 'role_percentage', label: 'Role + percentage' },
  { value: 'specific_approver', label: 'Specific approver' },
];

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const StepBuilder = ({
  steps = [],
  roleOptions = [],
  approverOptions = [],
  onChange,
  minSteps = 1,
  maxSteps = 8,
}) => {
  const updateStep = (index, updater) => {
    const nextSteps = [...steps];
    nextSteps[index] = updater(nextSteps[index]);
    onChange(nextSteps);
  };

  const handleModeChange = (index, mode) => {
    updateStep(index, (step) => ({
      ...step,
      mode,
      percentage: mode === 'role_percentage' ? (step.percentage ?? 100) : '',
      roleIds: mode === 'role_percentage' ? normalizeArray(step.roleIds) : [],
      approverIds: mode === 'specific_approver' ? normalizeArray(step.approverIds) : [],
    }));
  };

  const toggleArrayValue = (index, field, value) => {
    updateStep(index, (step) => {
      const current = normalizeArray(step[field]);
      const nextValues = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];

      return {
        ...step,
        [field]: nextValues,
      };
    });
  };

  const addStep = () => {
    if (steps.length >= maxSteps) return;
    onChange([
      ...steps,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mode: 'role_percentage',
        percentage: 100,
        roleIds: [],
        approverIds: [],
      },
    ]);
  };

  const removeStep = (index) => {
    if (steps.length <= minSteps) return;
    onChange(steps.filter((_, stepIndex) => stepIndex !== index));
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Step {index + 1}</p>
              <p className="text-xs text-slate-500">
                Choose whether this step uses roles with a required percentage, or named approvers directly.
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeStep(index)}
              disabled={steps.length <= minSteps}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              Remove step
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Step type</label>
              <select
                value={step.mode}
                onChange={(event) => handleModeChange(index, event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {STEP_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {step.mode === 'role_percentage' ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[180px_1fr]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Required percentage</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={step.percentage ?? ''}
                      onChange={(event) => updateStep(index, (current) => ({
                        ...current,
                        percentage: event.target.value,
                      }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-slate-500">%</span>
                  </div>
                </div>

                <div>
                  <MultiSelectDropdown
                    label="Roles in this step"
                    placeholder="Select roles"
                    helperText="Choose one or more roles for this approval step."
                    options={roleOptions}
                    selectedValues={normalizeArray(step.roleIds)}
                    onToggle={(value) => toggleArrayValue(index, 'roleIds', value)}
                    emptyMessage="No company roles available yet."
                  />
                </div>
              </div>
            ) : (
              <div>
                <MultiSelectDropdown
                  label="Specific approvers in this step"
                  placeholder="Select employees"
                  helperText="Choose one or more employees for this approval step."
                  options={approverOptions}
                  selectedValues={normalizeArray(step.approverIds)}
                  onToggle={(value) => toggleArrayValue(index, 'approverIds', value)}
                  emptyMessage="No employees available yet."
                />
              </div>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addStep}
        disabled={steps.length >= maxSteps}
        className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={16} />
        Add Step
      </button>
    </div>
  );
};

export default StepBuilder;

import React, { useMemo, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

const StepBuilder = ({
  steps = [],
  approverOptions = [],
  onChange,
  minSteps = 1,
  maxSteps = 8,
}) => {
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  const optionsById = useMemo(() => {
    const map = {};
    approverOptions.forEach((option) => {
      map[option.id] = option;
    });
    return map;
  }, [approverOptions]);

  const updateStep = (index, field, value) => {
    const nextSteps = [...steps];
    nextSteps[index] = { ...nextSteps[index], [field]: value };
    onChange(nextSteps);
  };

  const addStep = () => {
    if (steps.length >= maxSteps) return;
    const newStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      approverId: '',
    };
    onChange([...steps, newStep]);
  };

  const removeStep = (index) => {
    if (steps.length <= minSteps) return;
    const nextSteps = steps.filter((_, idx) => idx !== index);
    onChange(nextSteps);
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragOver = (event, index) => {
    event.preventDefault();
    setDropIndex(index);
  };

  const handleDrop = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }

    const nextSteps = [...steps];
    const [movedStep] = nextSteps.splice(dragIndex, 1);
    nextSteps.splice(targetIndex, 0, movedStep);

    onChange(nextSteps);
    setDragIndex(null);
    setDropIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200">
                Step {index + 1}
                {step.approverId && (
                  <span className="ml-2 text-slate-500 font-medium">
                    {optionsById[step.approverId]?.name || 'Approver'}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <span className="text-slate-400 text-xs font-semibold">-&gt;</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(event) => handleDragOver(event, index)}
            onDrop={() => handleDrop(index)}
            className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
              dropIndex === index ? 'border-primary' : 'border-slate-200'
            } ${dragIndex === index ? 'opacity-60' : 'opacity-100'}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 text-slate-600 sm:min-w-[130px]">
                <GripVertical size={16} />
                <span className="text-sm font-semibold">Step {index + 1}</span>
              </div>

              <div className="w-full">
                <select
                  value={step.approverId}
                  onChange={(event) => updateStep(index, 'approverId', event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select approver...</option>
                  {approverOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => removeStep(index)}
                disabled={steps.length <= minSteps}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

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


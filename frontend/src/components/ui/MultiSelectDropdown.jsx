import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

const normalizeValues = (value) => (Array.isArray(value) ? value : []);
const stripEmailSuffix = (value = '') => value.replace(/\s*\([^)]*@[^)]*\)\s*$/, '').trim();

const MultiSelectDropdown = ({
  label,
  placeholder = 'Select options',
  helperText,
  options = [],
  selectedValues = [],
  onToggle,
  emptyMessage = 'No options available.',
}) => {
  const normalizedSelectedValues = normalizeValues(selectedValues);

  const selectedSummary = useMemo(() => {
    const selectedLabels = options
      .filter((option) => normalizedSelectedValues.includes(option.id))
      .map((option) => stripEmailSuffix(option.label || option.name));

    if (!selectedLabels.length) {
      return placeholder;
    }

    if (selectedLabels.length <= 2) {
      return selectedLabels.join(', ');
    }

    return `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2} more`;
  }, [normalizedSelectedValues, options, placeholder]);

  return (
    <div>
      {label ? (
        <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      ) : null}

      <details className="rounded-xl border border-slate-300 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm text-slate-700">
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{selectedSummary}</p>
            {helperText ? <p className="truncate text-xs text-slate-500">{helperText}</p> : null}
          </div>
          <ChevronDown size={16} className="shrink-0 text-slate-500 transition-transform details-open:rotate-180" />
        </summary>

        <div className="max-h-64 space-y-2 overflow-auto border-t border-slate-200 px-3 py-3">
          {options.length ? options.map((option) => (
            <label
              key={option.id}
              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={normalizedSelectedValues.includes(option.id)}
                onChange={() => onToggle(option.id)}
                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-800">
                  {stripEmailSuffix(option.label || option.name)}
                </span>
                {option.description ? (
                  <span className="block truncate text-xs text-slate-500">{option.description}</span>
                ) : null}
              </span>
            </label>
          )) : (
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          )}
        </div>
      </details>
    </div>
  );
};

export default MultiSelectDropdown;

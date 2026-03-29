import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

const EMPTY_VALUES = {
  name: '',
  email: '',
  role: 'employee',
  managerId: '',
};

const getInitialFormData = (initialValues) => {
  if (!initialValues) return EMPTY_VALUES;

  return {
    name: initialValues.name || '',
    email: initialValues.email || '',
    role: initialValues.role || 'employee',
    managerId: initialValues.managerId || '',
  };
};

const UserForm = ({
  isOpen,
  mode = 'create',
  initialValues = null,
  managers = [],
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState(() => getInitialFormData(initialValues));
  const [error, setError] = useState('');

  const isEditMode = mode === 'edit';

  const managerOptions = useMemo(() => (
    managers.map((manager) => ({ id: manager.id, name: manager.name }))
  ), [managers]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      setError('Name and email are required.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (formData.role === 'employee' && !formData.managerId) {
      setError('Please assign a manager for employees.');
      return;
    }

    await onSubmit({
      name: trimmedName,
      email: trimmedEmail,
      role: formData.role,
      managerId: formData.managerId || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {isEditMode ? 'Edit User' : 'Create User'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage employee and manager access from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="Full name"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="user@company.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label htmlFor="managerId" className="mb-1 block text-sm font-medium text-slate-700">
                Manager Relationship
              </label>
              <select
                id="managerId"
                name="managerId"
                value={formData.managerId}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">Unassigned</option>
                {managerOptions.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isEditMode ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;

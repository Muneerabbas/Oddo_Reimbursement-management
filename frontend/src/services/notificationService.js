import toast from 'react-hot-toast';

const baseOptions = {
  duration: 3500,
  style: {
    borderRadius: '0.75rem',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: '0.875rem',
  },
};

const notificationService = {
  success: (message, options = {}) => toast.success(message, { ...baseOptions, ...options }),
  error: (message, options = {}) => toast.error(message, { ...baseOptions, ...options }),
  info: (message, options = {}) => toast(message, { ...baseOptions, ...options }),
  loading: (message, options = {}) => toast.loading(message, { ...baseOptions, ...options }),
  dismiss: (toastId) => toast.dismiss(toastId),
  promise: (promise, messages, options = {}) => toast.promise(
    promise,
    messages,
    {
      ...baseOptions,
      ...options,
    },
  ),
};

export default notificationService;

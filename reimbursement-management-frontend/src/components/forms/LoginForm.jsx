import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Local Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic native validation checks
    if (!email || !password) {
      setError('Please provide both email and password.');
      setIsLoading(false);
      return;
    }

    try {
      // Simulate/Execute the API call map via Axios
      const data = await authService.login(email, password);
      // Expected backend layout returned structure: { user: { id, email, role }, token: '...' }
      login(data.user, data.token);

      // Once successfully logged in, push user back to their dashboard dynamically
      navigate('/dashboard', { replace: true });

    } catch (err) {
      if (err.response?.status === 401) {
         setError('Invalid credentials provided.');
      } else if (err.code === 'ERR_NETWORK') {
         setError('Cannot reach authentication server. Is your backend running?');
      } else {
         setError(err.response?.data?.message || 'An unexpected server error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Welcome Back</h2>
      
      {/* Dynamic Error State Alerts */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm">
           <p className="font-medium">Authentication Failed</p>
           <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email Field Group */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {/* Password Field Group */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center text-slate-600">
            <input type="checkbox" className="rounded text-primary focus:ring-primary border-slate-300 mr-2" />
            Remember me
          </label>
          <a href="#" className="font-semibold text-primary hover:text-primary-dark transition-colors">
            Forgot password?
          </a>
        </div>

        {/* Form Actions */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Signing in...</span>
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.login(email, password);
      login(data.user, {
        accessToken: data.token,
        refreshToken: data.refreshToken,
      });
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
      <h2 className="mb-6 text-center text-xl font-bold text-slate-800">Welcome Back</h2>

      {error && (
        <div className="mb-4 rounded border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Authentication Failed</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center text-slate-600">
            <input type="checkbox" className="mr-2 rounded border-slate-300 text-primary focus:ring-primary" />
            Remember me
          </label>
          <a href="#" className="font-semibold text-primary transition-colors hover:text-primary-dark">
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-sm transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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

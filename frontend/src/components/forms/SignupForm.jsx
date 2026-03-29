import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';

const SignupForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    country: '',
  });
  const [countries, setCountries] = useState([]);
  const [fetchingCountries, setFetchingCountries] = useState(true);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCountries = async () => {
      try {
        const list = await authService.getCountries();
        if (!cancelled) {
          setCountries(list);
          setFetchingCountries(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed fetching countries:', err);
          setFetchingCountries(false);
        }
      }
    };

    fetchCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.name || !formData.email || !formData.password || !formData.country) {
      setError('Please ensure all fields are filled out properly.');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.signup(formData);
      login(response.user, {
        accessToken: response.token,
        refreshToken: response.refreshToken,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Could not reach our servers. Check connection.');
      } else {
        setError(err.response?.data?.message || 'Failed to register. Server error.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="mb-2 text-center text-xl font-bold text-slate-800">Create Company Core</h2>
      <p className="mb-6 text-center text-sm text-slate-500">
        Register your organization below. Your workspace will automatically be initialized.
      </p>

      {error && (
        <div className="mb-4 rounded border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Registration Failed</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            disabled={isLoading}
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            Business Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="john@yourdomain.com"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="country">
            Company Country
          </label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            disabled={isLoading || fetchingCountries}
            required
            className={`w-full rounded-lg border border-slate-300 bg-white px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500 ${!formData.country ? 'text-slate-400' : 'text-slate-900'}`}
          >
            <option value="" disabled>Select your primary country...</option>
            {countries.map((country) => (
              <option key={country.name.common} value={country.name.common}>
                {country.name.common}
              </option>
            ))}
          </select>
          {fetchingCountries && <p className="mt-1 pl-1 text-xs text-slate-400">Loading database...</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
            Secure Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="********"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || fetchingCountries}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-sm transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Creating Organization...</span>
            </>
          ) : (
            'Register Organization'
          )}
        </button>
      </form>
    </div>
  );
};

export default SignupForm;

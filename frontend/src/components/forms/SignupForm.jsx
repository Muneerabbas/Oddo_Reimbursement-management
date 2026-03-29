import React, { useState, useEffect } from 'react';
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
    companyName: '',
    companyAbout: '',
    companyWebsite: '',
    companyIndustry: '',
    companyPhone: '',
  });

  const [countries, setCountries] = useState([]);
  const [fetchingCountries, setFetchingCountries] = useState(true);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let internalCancel = false;

    const loadCountries = async () => {
      try {
        const list = await authService.getCountries();
        if (!internalCancel) {
          setCountries(list);
          setFetchingCountries(false);
        }
      } catch (err) {
        if (!internalCancel) {
          console.error('Failed fetching countries:', err);
          setFetchingCountries(false);
        }
      }
    };

    loadCountries();
    return () => {
      internalCancel = true;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.name || !formData.email || !formData.password || !formData.country) {
      setError('Please fill in your name, email, password, and company country.');
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
      login(response.user, response.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Could not reach the server. Is the API running?');
      } else {
        setError(
          err.message ||
            err.response?.data?.message ||
            'Registration failed. Please try again.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Create your workspace</h2>
      <p className="text-sm text-slate-500 text-center mb-6">
        Register your organization. Default currency follows the country you select. You will be the
        company administrator.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm">
          <p className="font-medium">Registration failed</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">
            Your full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Jane Doe"
            value={formData.name}
            onChange={handleChange}
            disabled={isLoading}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
            Business email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="country">
            Company country
          </label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            disabled={isLoading || fetchingCountries}
            required
            className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none bg-white disabled:bg-slate-50 ${
              !formData.country ? 'text-slate-400' : 'text-slate-900'
            }`}
          >
            <option value="" disabled>
              Select country (sets workspace currency)…
            </option>
            {countries.map((c) => (
              <option key={c.cca2} value={c.cca2}>
                {c.name.common}
              </option>
            ))}
          </select>
          {fetchingCountries && (
            <p className="text-xs text-slate-400 mt-1 pl-1">Loading countries…</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50"
          />
        </div>

        <div className="pt-2 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Company profile (optional)
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="companyName">
                Legal / display company name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Leave blank to default from your name"
                value={formData.companyName}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="companyAbout">
                About the company
              </label>
              <textarea
                id="companyAbout"
                name="companyAbout"
                rows={3}
                placeholder="What does your organization do?"
                value={formData.companyAbout}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none resize-y disabled:bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="companyIndustry">
                  Industry
                </label>
                <input
                  id="companyIndustry"
                  name="companyIndustry"
                  type="text"
                  placeholder="e.g. Technology"
                  value={formData.companyIndustry}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="companyPhone">
                  Phone
                </label>
                <input
                  id="companyPhone"
                  name="companyPhone"
                  type="tel"
                  placeholder="+1 …"
                  value={formData.companyPhone}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="companyWebsite">
                Website
              </label>
              <input
                id="companyWebsite"
                name="companyWebsite"
                type="url"
                placeholder="https://example.com"
                value={formData.companyWebsite}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || fetchingCountries}
          className="w-full py-2.5 px-4 mt-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Creating workspace…</span>
            </>
          ) : (
            'Register organization'
          )}
        </button>
      </form>
    </div>
  );
};

export default SignupForm;

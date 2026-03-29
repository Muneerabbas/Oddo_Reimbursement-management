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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      login(response.user, {
        accessToken: response.token,
        refreshToken: response.refreshToken,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Could not reach the server. Is the API running?');
      } else {
        setError(
          err.message
            || err.response?.data?.message
            || 'Registration failed. Please try again.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="mb-2 text-center text-xl font-bold text-slate-800">Create your workspace</h2>
      <p className="mb-6 text-center text-sm text-slate-500">
        Register your organization. Default currency follows the country you select. You will be the
        company administrator.
      </p>

      {error && (
        <div className="mb-4 rounded border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Registration failed</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="name">
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
            className="w-full rounded-lg border border-slate-300 px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
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
            className="w-full rounded-lg border border-slate-300 px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="country">
            Company country
          </label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            disabled={isLoading || fetchingCountries}
            required
            className={`w-full rounded-lg border border-slate-300 bg-white px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 ${
              !formData.country ? 'text-slate-400' : 'text-slate-900'
            }`}
          >
            <option value="" disabled>Select country (sets workspace currency)...</option>
            {countries.map((country) => (
              <option key={country.cca2} value={country.cca2}>
                {country.name.common}
              </option>
            ))}
          </select>
          {fetchingCountries && (
            <p className="mt-1 pl-1 text-xs text-slate-400">Loading countries...</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
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
            className="w-full rounded-lg border border-slate-300 px-4 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50"
          />
        </div>

        <div className="border-t border-slate-200 pt-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Company profile (optional)
          </p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="companyName">
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
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="companyAbout">
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
                className="w-full resize-y rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="companyIndustry">
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="companyPhone">
                  Phone
                </label>
                <input
                  id="companyPhone"
                  name="companyPhone"
                  type="tel"
                  placeholder="+1 ..."
                  value={formData.companyPhone}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="companyWebsite">
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
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || fetchingCountries}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Creating workspace...</span>
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

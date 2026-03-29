import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';

const SignupForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Local Form State variables
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    country: ''
  });
  
  // Data / Status states
  const [countries, setCountries] = useState([]);
  const [fetchingCountries, setFetchingCountries] = useState(true);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load the countries automatically using the Auth API service
  useEffect(() => {
    let internalCancel = false;
    
    const fillDropwdown = async () => {
       try {
          const list = await authService.getCountries();
          if(!internalCancel) {
             setCountries(list);
             setFetchingCountries(false);
          }
       } catch(err) {
          if(!internalCancel) {
            console.error('Failed fetching countries:', err);
            // Non-blocking error. Let the form display, but maybe an error option
            setFetchingCountries(false);
          }
       }
    };
    
    fillDropwdown();
    return () => { internalCancel = true; };
  }, []);

  // Update localized text variables directly to form object structure
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Primitive explicit fields mapping
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
      // Wait for mapped user properties + auth token payload from Backend
      login(response.user, response.token);
      
      // Navigate on successful authentication
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
         setError('Could not reach our servers. Check connection.');
      } else {
         setError(err.response?.data?.message || 'Failed to auto-create company or register user. Server error.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Create Company Core</h2>
      <p className="text-sm text-slate-500 text-center mb-6">
        Register your organization below. Your workspace will automatically be initialized.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm">
           <p className="font-medium">Registration Failed</p>
           <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Name Registration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">
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
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {/* Email Registration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
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
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {/* Global Country Fetch Box */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="country">
            Company Country
          </label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            disabled={isLoading || fetchingCountries}
            required
            className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none bg-white transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${!formData.country ? 'text-slate-400' : 'text-slate-900'}`}
          >
            <option value="" disabled>Select your primary country...</option>
            {countries.map(c => (
               <option key={c.name.common} value={c.name.common}>{c.name.common}</option>
            ))}
          </select>
          {fetchingCountries && <p className="text-xs text-slate-400 mt-1 pl-1">Loading database...</p>}
        </div>

        {/* Password Registration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
            Secure Password
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
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {/* Form Registration Submission */}
        <button
          type="submit"
          disabled={isLoading || fetchingCountries}
          className="w-full py-2 px-4 mt-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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

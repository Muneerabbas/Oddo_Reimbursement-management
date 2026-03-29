import apiClient from './apiClient';
import axios from 'axios';

// The authService abstracts all endpoints related to user authentication
const authService = {
  /**
   * Login user with email and password
   * @param {string} email
   * @param {string} password
   */
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Register a new user and potentially automatically map/create their company backend-side
   * @param {Object} userData - { name, email, password, country }
   */
  signup: async (userData) => {
    const response = await apiClient.post('/auth/signup', userData);
    return response.data;
  },

  /**
   * Fetch a list of countries from an external API for the registration form
   * This calls a full URL directly so it circumvents the apiClient's base URL
   */
  getCountries: async () => {
    const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,currencies');
    // Sort countries alphabetically by their common name for better UX
    return response.data.sort((a, b) => a.name.common.localeCompare(b.name.common));
  },
};

export default authService;

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
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Hardcoded mock successful response
    return {
      user: {
        id: 'USR-1001',
        name: 'Demo Admin',
        email: email,
        role: 'admin', // Mocked as admin to showcase all features
      },
      token: 'mock-jwt-token-123456789'
    };
  },

  /**
   * Register a new user and potentially automatically map/create their company backend-side
   * @param {Object} userData - { name, email, password, country }
   */
  signup: async (userData) => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Hardcoded mock successful response
    return {
      user: {
        id: 'USR-1002',
        name: userData.name,
        email: userData.email,
        role: 'manager', 
      },
      token: 'mock-jwt-token-987654321'
    };
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

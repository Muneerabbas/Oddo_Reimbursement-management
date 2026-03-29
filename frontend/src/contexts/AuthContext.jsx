import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AUTH_SESSION_EXPIRED_EVENT } from '../services/apiClient';

// Create the unified Authentication Context
export const AuthContext = createContext({
  user: null,
  role: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logoutUser = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setRole(null);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setRole(parsedUser.role || null);
      } catch (err) {
        console.error('Failed to parse user session', err);
        logoutUser();
      }
    }
    setIsLoading(false);
  }, [logoutUser]);

  useEffect(() => {
    const onSessionExpired = () => {
      logoutUser();
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [logoutUser]);

  /**
   * Stores the structured auth context data inside LocalStorage and React State
   * Call this explicitly from your LoginForm component
   * @param {Object} userData - Database mapped user details
   * @param {string} token    - JWT Authentication Token
   */
  const loginUser = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    setRole(userData.role || null);
  };

  const contextValue = {
    user,
    role,
    isAuthenticated: !!user,
    login: loginUser,
    logout: logoutUser,
    isLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

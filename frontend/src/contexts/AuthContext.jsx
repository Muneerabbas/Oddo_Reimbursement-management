/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useEffect, useState } from 'react';
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  setAuthTokens,
  setStoredUser,
} from '../utils/authStorage';

// Create the unified Authentication Context
export const AuthContext = createContext({
  user: null,
  role: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  canAccess: () => false,
  isLoading: true,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Wipes LocalStorage and clears State to secure layout exit
   */
  const logoutUser = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setRole(null);
  }, []);

  useEffect(() => {
    // Check for an existing token and hydrate the state on load
    const initializeAuth = () => {
      const storedToken = getAccessToken();
      const parsedUser = getStoredUser();
      
      if (storedToken && parsedUser) {
        setUser(parsedUser);
        setRole(parsedUser.role || null);
      } else if (storedToken && !parsedUser) {
        logoutUser();
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, [logoutUser]);

  useEffect(() => {
    const handleSessionLogout = () => {
      logoutUser();
    };

    window.addEventListener('auth:logout', handleSessionLogout);
    return () => {
      window.removeEventListener('auth:logout', handleSessionLogout);
    };
  }, [logoutUser]);

  /**
   * Stores the structured auth context data inside LocalStorage and React State
   * Call this explicitly from your LoginForm component
   * @param {Object} userData - Database mapped user details
   * @param {string|Object} tokenData - Access token string or token object
   */
  const loginUser = useCallback((userData, tokenData) => {
    const accessToken = typeof tokenData === 'string'
      ? tokenData
      : tokenData?.accessToken || tokenData?.token || null;
    const refreshToken = typeof tokenData === 'string'
      ? null
      : tokenData?.refreshToken || null;

    if (accessToken) {
      setAuthTokens({ accessToken, refreshToken });
    }
    setStoredUser(userData);
    
    setUser(userData);
    setRole(userData.role || null);
  }, []);

  const canAccess = (allowedRoles = []) => {
    if (!user) return false;
    if (allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  };

  const contextValue = {
    user,
    role,
    isAuthenticated: !!user && !!getAccessToken(),
    login: loginUser,
    logout: logoutUser,
    canAccess,
    isLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

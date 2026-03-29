/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { AUTH_SESSION_EXPIRED_EVENT } from '../services/apiClient';
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  setAuthTokens,
  setStoredUser,
} from '../utils/authStorage';

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
  const [user, setUser] = useState(() => {
    const storedToken = getAccessToken();
    const parsedUser = getStoredUser();

    if (storedToken && parsedUser) {
      return parsedUser;
    }

    if (storedToken && !parsedUser) {
      clearAuthStorage();
    }

    return null;
  });
  const [role, setRole] = useState(() => user?.role || null);
  const [isLoading] = useState(false);

  const logoutUser = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setRole(null);
  }, []);

  useEffect(() => {
    const onSessionExpired = () => logoutUser();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [logoutUser]);

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

  const canAccess = useCallback((allowedRoles = []) => {
    if (!user) return false;
    if (allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  }, [user]);

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

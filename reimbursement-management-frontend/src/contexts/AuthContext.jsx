import React, { createContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    // Check for an existing token and hydrate the state on load
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setRole(parsedUser.role || null);
        } catch (err) {
          console.error('Failed to parse user session', err);
          logoutUser(); // Clean up corrupted session data
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

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

  /**
   * Wipes LocalStorage and clears State to secure layout exit
   */
  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setUser(null);
    setRole(null);
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

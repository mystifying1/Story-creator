// frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Apply dark mode to body
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const loadUserData = async () => {
    try {
      // User data is stored in token, decode it or fetch from API if needed
      setLoading(false);
    } catch (error) {
      console.error('Load user error:', error);
      logout();
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password
      });
      
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setDarkMode(userData.darkMode);
      setLanguage(userData.preferredLanguage);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setDarkMode(userData.darkMode);
      setLanguage(userData.preferredLanguage);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateSettings = async (newDarkMode, newLanguage) => {
    try {
      const response = await axios.put(`${API_URL}/auth/settings`, {
        darkMode: newDarkMode,
        preferredLanguage: newLanguage
      });
      
      setUser(response.data.user);
      setDarkMode(newDarkMode);
      setLanguage(newLanguage);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Update failed' 
      };
    }
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !darkMode;
    await updateSettings(newDarkMode, language);
  };

  const changeLanguage = async (newLanguage) => {
    await updateSettings(darkMode, newLanguage);
  };

  const value = {
    user,
    token,
    loading,
    darkMode,
    language,
    register,
    login,
    logout,
    toggleDarkMode,
    changeLanguage,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
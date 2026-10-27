import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY_TOKEN = 'date_logger_token';
const STORAGE_KEY_USER = 'date_logger_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Restore stored session on startup
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        const storedUser = await AsyncStorage.getItem(STORAGE_KEY_USER);

        if (storedToken) {
          setToken(storedToken);
        }
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.warn('Failed to restore auth from storage', err);
      } finally {
        setIsInitializing(false);
      }
    }

    loadStoredAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const data = await authAPI.login(email, password);
      setToken(data.token);
      setUser(data.user);

      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, data.token);
      if (data.user) {
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
      }
      return data;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const data = await authAPI.register(email, password);
      return data;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore network errors on logout
    }
    setToken('');
    setUser(null);
    setAuthError(null);
    await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEY_USER);
  };

  const clearError = () => setAuthError(null);

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    isInitializing,
    isLoading,
    authError,
    clearError,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


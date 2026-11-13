import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, setOnUnauthorized } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY_TOKEN = 'date_logger_token';
const STORAGE_KEY_USER = 'date_logger_user';
const STORAGE_KEY_POSTS = 'date_logger_cached_posts';
const STORAGE_KEY_IDEAS = 'date_logger_bucket_list';
const IDEAS_MIGRATED_PREFIX = 'date_logger_ideas_migrated_';

/** Removes everything cached for the signed-in user from this device. */
async function clearSessionStorage(userId) {
  const keys = [STORAGE_KEY_TOKEN, STORAGE_KEY_USER, STORAGE_KEY_POSTS];
  try {
    // The bucket list copy is only dropped once it has been saved to the account,
    // so ideas created before sync existed are never lost by signing out.
    if (userId && (await AsyncStorage.getItem(IDEAS_MIGRATED_PREFIX + userId)) === 'true') {
      keys.push(STORAGE_KEY_IDEAS);
    }
    await AsyncStorage.multiRemove(keys);
  } catch (e) {
    console.warn('Failed to clear auth storage', e);
  }
}

/**
 * Pure JavaScript base64 decoding helper for React Native
 */
function decodeBase64(input) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';
  for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

/**
 * Checks whether a JWT token has expired or is invalid.
 */
function isJwtExpired(jwtToken) {
  if (!jwtToken || typeof jwtToken !== 'string') return true;
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return true;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    let decodedStr = '';
    if (typeof global.atob === 'function') {
      decodedStr = global.atob(base64);
    } else {
      decodedStr = decodeBase64(base64);
    }

    const payload = JSON.parse(decodedStr);
    if (!payload.exp) return false;
    // Buffer by 5 seconds to prevent edge-case race conditions
    return Date.now() >= (payload.exp * 1000 - 5000);
  } catch (e) {
    return true; // If token is unparseable, treat as expired
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const userRef = useRef(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore network errors on logout
    }
    const userId = userRef.current?.id;
    setToken('');
    setUser(null);
    setAuthError(null);
    await clearSessionStorage(userId);
  }, []);

  // Hook into global API 401 Unauthorized handler
  useEffect(() => {
    setOnUnauthorized(() => {
      console.log('401 Unauthorized encountered -> logging out user');
      logout();
    });
  }, [logout]);

  // Restore stored session on startup
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        const storedUser = await AsyncStorage.getItem(STORAGE_KEY_USER);

        // If no token is found in storage, immediately route to Login page
        if (!storedToken) {
          setToken('');
          setUser(null);
          setIsInitializing(false);
          return;
        }

        // If stored token is expired locally, wipe it and kick to Login page
        if (isJwtExpired(storedToken)) {
          console.log('Stored token is expired, clearing session to login');
          await AsyncStorage.multiRemove([
            STORAGE_KEY_TOKEN,
            STORAGE_KEY_USER,
            STORAGE_KEY_POSTS,
          ]);
          setToken('');
          setUser(null);
          setIsInitializing(false);
          return;
        }

        // Token is not expired locally -> verify it with the backend
        try {
          const res = await authAPI.me(storedToken);
          setToken(storedToken);
          const freshUser = res?.user || (storedUser ? JSON.parse(storedUser) : null);
          setUser(freshUser);
          if (res?.user) {
            await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user));
          }
        } catch (apiErr) {
          if (apiErr?.status === 401) {
            console.log('Server rejected token, kicking user to login page');
            await AsyncStorage.multiRemove([
              STORAGE_KEY_TOKEN,
              STORAGE_KEY_USER,
              STORAGE_KEY_POSTS,
            ]);
            setToken('');
            setUser(null);
          } else {
            // Offline or server hiccup: allow cached access since the JWT is not expired
            setToken(storedToken);
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          }
        }
      } catch (err) {
        console.warn('Failed to restore auth from storage', err);
        setToken('');
        setUser(null);
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

  /** Clears the session on this device without calling the server (e.g. after deleting the account). */
  const endSession = useCallback(async () => {
    const userId = userRef.current?.id;
    setToken('');
    setUser(null);
    setAuthError(null);
    await clearSessionStorage(userId);
  }, []);

  /** Merges changes (such as a newly linked partner) into the stored user. */
  const updateUser = useCallback((changes) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...changes };
      AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

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
    endSession,
    updateUser,
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

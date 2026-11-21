import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { secureStorage, tokenStore } from '../services/secureStorage';
import { authAPI, setOnUnauthorized } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY_USER = 'date_logger_user';
const STORAGE_KEY_POSTS = 'date_logger_cached_posts';
const STORAGE_KEY_IDEAS = 'date_logger_bucket_list';
const STORAGE_KEY_DRAFT = 'date_logger_log_draft';
const IDEAS_MIGRATED_PREFIX = 'date_logger_ideas_migrated_';
export const ONBOARDING_PENDING_KEY = 'date_logger_partner_walkthrough_pending';

/** Removes everything cached for the signed-in user from this device. */
async function clearSessionStorage(userId) {
  const keys = [STORAGE_KEY_USER, STORAGE_KEY_POSTS, STORAGE_KEY_DRAFT, ONBOARDING_PENDING_KEY];
  try {
    await tokenStore.clear();
    // The bucket list copy is only dropped once it has been saved to the account,
    // so ideas created before sync existed are never lost by signing out.
    if (userId && (await secureStorage.getItem(IDEAS_MIGRATED_PREFIX + userId)) === 'true') {
      keys.push(STORAGE_KEY_IDEAS);
    }
    await secureStorage.multiRemove(keys);
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
  // True right after sign-up until the partner-linking walkthrough is finished or skipped.
  const [needsPartnerWalkthrough, setNeedsPartnerWalkthrough] = useState(false);
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
    setNeedsPartnerWalkthrough(false);
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
        const storedToken = await tokenStore.get();
        const storedUser = await secureStorage.getItem(STORAGE_KEY_USER);

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
          await clearSessionStorage(storedUser ? JSON.parse(storedUser)?.id : null);
          setToken('');
          setUser(null);
          setIsInitializing(false);
          return;
        }

        // A walkthrough interrupted by closing the app is shown again.
        const walkthroughPending = (await secureStorage.getItem(ONBOARDING_PENDING_KEY)) === 'true';

        // Token is not expired locally -> verify it with the backend
        try {
          const res = await authAPI.me(storedToken);
          setNeedsPartnerWalkthrough(walkthroughPending && !res?.user?.partner);
          setToken(storedToken);
          const freshUser = res?.user || (storedUser ? JSON.parse(storedUser) : null);
          setUser(freshUser);
          if (res?.user) {
            await secureStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user));
          }
        } catch (apiErr) {
          if (apiErr?.status === 401) {
            console.log('Server rejected token, kicking user to login page');
            await clearSessionStorage(storedUser ? JSON.parse(storedUser)?.id : null);
            setToken('');
            setUser(null);
          } else {
            // Offline or server hiccup: allow cached access since the JWT is not expired
            setNeedsPartnerWalkthrough(walkthroughPending);
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

  /** Signs in and stores the session. `walkthrough` shows the partner-linking walkthrough first. */
  const startSession = async (email, password, { walkthrough = false } = {}) => {
    const data = await authAPI.login(email, password);
    await tokenStore.set(data.token);
    if (data.user) {
      await secureStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    }
    if (walkthrough) {
      await secureStorage.setItem(ONBOARDING_PENDING_KEY, 'true');
    }
    // Set together so the app opens straight onto the walkthrough when there is one.
    setNeedsPartnerWalkthrough(walkthrough);
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      return await startSession(email, password);
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Creates the account, then signs straight in and opens the partner walkthrough.
   * Resolves to { signedIn: false } if the account was made but signing in failed,
   * so the caller can send the user to the login form.
   */
  const register = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const data = await authAPI.register(email, password);
      try {
        await startSession(email, password, { walkthrough: true });
        return { ...data, signedIn: true };
      } catch (e) {
        return { ...data, signedIn: false };
      }
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
    setNeedsPartnerWalkthrough(false);
    await clearSessionStorage(userId);
  }, []);

  /** Ends the partner walkthrough, whether the user linked or skipped. */
  const finishPartnerWalkthrough = useCallback(async () => {
    setNeedsPartnerWalkthrough(false);
    await secureStorage.removeItem(ONBOARDING_PENDING_KEY).catch(() => {});
  }, []);

  /** Merges changes (such as a newly linked partner) into the stored user. */
  const updateUser = useCallback((changes) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...changes };
      secureStorage.setItem(STORAGE_KEY_USER, JSON.stringify(next)).catch(() => {});
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
    needsPartnerWalkthrough,
    finishPartnerWalkthrough,
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

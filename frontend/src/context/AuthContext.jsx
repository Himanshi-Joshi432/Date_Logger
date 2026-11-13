import { createContext, useContext, useState, useEffect } from "react";
import { authAPI, setOnUnauthorized } from "../services/api";

function readStoredUser() {
  try {
    const saved = localStorage.getItem("date_logger_user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("date_logger_token") || "",
  );
  const [user, setUser] = useState(readStoredUser);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Any 401 on an authenticated request (expired/invalid token) ends the session,
  // which sends the user back to /login via ProtectedRoute.
  useEffect(() => {
    setOnUnauthorized(() => {
      setToken("");
      setUser(null);
      setAuthError("Your session has expired. Please sign in again.");
    });
    return () => setOnUnauthorized(null);
  }, []);

  // Validate a stored token once on load so an expired session doesn't
  // show the app until the first data request fails.
  useEffect(() => {
    if (token) {
      authAPI.me(token).catch(() => {
        // 401 is handled by the unauthorized hook; ignore network errors.
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("date_logger_token", token);
    } else {
      localStorage.removeItem("date_logger_token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("date_logger_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("date_logger_user");
    }
  }, [user]);

  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const data = await authAPI.login(email, password);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setAuthError(err.message);
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
      setAuthError(err.message);
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
    setToken("");
    setUser(null);
    setAuthError(null);
  };

  /** Clears the local session without calling the server (e.g. after account deletion). */
  const endSession = () => {
    setToken("");
    setUser(null);
    setAuthError(null);
  };

  const clearError = () => setAuthError(null);

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    isLoading,
    authError,
    clearError,
    login,
    register,
    logout,
    endSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

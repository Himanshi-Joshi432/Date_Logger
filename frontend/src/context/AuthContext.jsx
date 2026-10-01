import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("date_logger_token") || "",
  );
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("date_logger_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

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

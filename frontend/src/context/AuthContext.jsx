// AuthContext.jsx (thin wrapper)
import { useApp } from "./AppContext";

// Re-export the auth slice from AppContext to keep imports stable
export const useAuth = () => {
  const ctx = useApp();
  return {
    user: ctx.user,
    isAuthenticated: ctx.isAuthenticated,
    login: ctx.login,
    logout: ctx.logout,
    authLoading: ctx.authLoading,
  };
};

// For compatibility, export a dummy provider component that just renders children.
export const AuthProvider = ({ children }) => children;

export default null;

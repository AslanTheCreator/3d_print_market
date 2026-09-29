import { useAuthStore } from "./authStore";

export const useAuth = () => {
  const {
    isAuthenticated,
    isInitialized,
    sessionRevision,
    user,
    login,
    logout,
    checkAuthStatus,
  } = useAuthStore();

  return {
    isAuthenticated,
    isInitialized,
    sessionKey: isInitialized && isAuthenticated ? sessionRevision : null,
    user,
    login,
    logout,
    checkAuthStatus,
  };
};

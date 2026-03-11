import { useAuthStore } from "./authStore";

export const useAuth = () => {
  const {
    isAuthenticated,
    isInitialized,
    user,
    login,
    logout,
    checkAuthStatus,
  } = useAuthStore();

  return {
    isAuthenticated,
    isInitialized,
    user,
    login,
    logout,
    checkAuthStatus,
  };
};

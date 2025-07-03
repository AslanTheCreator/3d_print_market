import { useAuthStore } from "@/app/store";

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

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/features/auth/api/authApi";
import { tokenStorage } from "@/shared/lib/token/tokenStorage";

interface AuthState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: {
    id?: string;
    login?: string;
  } | null;
  // Actions
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  checkAuthStatus: () => boolean;
  refreshToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isInitialized: false,
      user: null,

      login: async (login: string, password: string) => {
        try {
          const success = await authApi.loginUser({ login, password });
          if (success) {
            set({
              isAuthenticated: true,
              user: { login },
            });
            return true;
          }
          return false;
        } catch (error) {
          set({ isAuthenticated: false, user: null });
          throw error;
        }
      },

      logout: () => {
        authApi.logout();
        set({
          isAuthenticated: false,
          user: null,
        });
      },

      initializeAuth: async () => {
        try {
          const accessToken = tokenStorage.getAccessToken();
          const refreshToken = tokenStorage.getRefreshToken();

          if (accessToken) {
            // Токен есть, пользователь аутентифицирован
            set({
              isAuthenticated: true,
              isInitialized: true,
            });
          } else if (refreshToken) {
            // Access токена нет, но есть refresh - пробуем обновить
            const refreshSuccess = await get().refreshToken();
            set({
              isAuthenticated: refreshSuccess,
              isInitialized: true,
            });
          } else {
            // Токенов нет
            set({
              isAuthenticated: false,
              isInitialized: true,
            });
          }
        } catch (error) {
          console.error("Auth initialization failed:", error);
          set({
            isAuthenticated: false,
            isInitialized: true,
          });
        }
      },

      checkAuthStatus: () => {
        const accessToken = tokenStorage.getAccessToken();
        const isAuth = !!accessToken;

        if (get().isAuthenticated !== isAuth) {
          set({ isAuthenticated: isAuth });
        }

        return isAuth;
      },

      refreshToken: async () => {
        try {
          await authApi.refreshAccessToken();
          set({ isAuthenticated: true });
          return true;
        } catch (error) {
          console.error("Token refresh failed:", error);
          set({ isAuthenticated: false, user: null });
          return false;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

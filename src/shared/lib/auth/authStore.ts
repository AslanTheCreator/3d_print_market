"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/shared/api";
import { tokenStorage } from "@/shared/lib";
import { tokenRefreshManager } from "@/shared/lib/token/tokenRefreshManager";

interface AuthState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: {
    id?: string;
    mail?: string;
  } | null;
  login: (mail: string, password: string) => Promise<boolean>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  checkAuthStatus: () => boolean;
  refreshToken: () => Promise<boolean>;
  setAuthenticated: () => void;
}

const log = (message: string, data?: unknown): void => {
  if (process.env.NODE_ENV !== "development") return;

  if (data !== undefined) {
    console.log(`[AuthStore] ${message}`, data);
  } else {
    console.log(`[AuthStore] ${message}`);
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isInitialized: false,
      user: null,

      login: async (mail: string, password: string) => {
        try {
          const success = await authApi.loginUser({ mail, password });

          if (success) {
            log("Login successful");
            set({
              isAuthenticated: true,
              user: { mail },
            });

            if (tokenRefreshManager.isInitialized()) {
              tokenRefreshManager.start();
            }

            return true;
          }

          return false;
        } catch (error) {
          set({ isAuthenticated: false, user: null });
          throw error;
        }
      },

      logout: () => {
        log("Logging out");
        tokenRefreshManager.stop();
        authApi.logout();
        set({
          isAuthenticated: false,
          user: null,
        });
      },

      setAuthenticated: () => {
        log("Setting authenticated");
        set({
          isAuthenticated: true,
        });

        if (tokenRefreshManager.isInitialized()) {
          tokenRefreshManager.start();
        }
      },

      initializeAuth: async () => {
        try {
          const accessToken = tokenStorage.getAccessToken();
          const refreshToken = tokenStorage.getRefreshToken();

          if (accessToken) {
            log("Access token found, setting authenticated");
            set({
              isAuthenticated: true,
              isInitialized: true,
            });

            if (tokenRefreshManager.isInitialized()) {
              tokenRefreshManager.start();
            }
          } else if (refreshToken) {
            log("Only refresh token found, attempting refresh");
            const refreshSuccess = await get().refreshToken();

            set({
              isAuthenticated: refreshSuccess,
              isInitialized: true,
            });

            if (!refreshSuccess) {
              set({ user: null });
            }
          } else {
            log("No tokens found");
            set({
              isAuthenticated: false,
              isInitialized: true,
              user: null,
            });
          }
        } catch (error) {
          console.error("Auth initialization failed:", error);
          set({
            isAuthenticated: false,
            isInitialized: true,
            user: null,
          });
        }
      },

      checkAuthStatus: () => {
        const accessToken = tokenStorage.getAccessToken();
        const isAuth = !!accessToken;

        if (get().isAuthenticated !== isAuth) {
          log("Auth status changed", { isAuth });
          set({ isAuthenticated: isAuth });
        }

        return isAuth;
      },

      refreshToken: async () => {
        log("Refreshing token...");

        try {
          await authApi.refreshAccessToken();
          log("Token refreshed successfully");
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
    },
  ),
);

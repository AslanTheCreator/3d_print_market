"use client";

import { serializeApiError } from "@/shared/lib/errorHandler";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { tokenRefreshManager, tokenStorage } from "@/shared/lib";
import { authApi } from "../api/authApi";
import { advanceSessionGeneration, getSessionSignal } from "./sessionGeneration";
import { createAuthStorage } from "./authPersistence";

let pendingRefresh: { generation: AbortSignal; promise: Promise<boolean> } | null = null;

export interface AuthState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  sessionRevision: number;
  accountRevision: number;
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
  getSessionSignal: () => AbortSignal;
}

const log = (message: string): void => {
  if (process.env.NODE_ENV !== "development") return;
  console.log(`[AuthStore] ${message}`);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isInitialized: false,
      sessionRevision: 0,
      accountRevision: 0,
      user: null,
      getSessionSignal,

      login: async (mail: string, password: string) => {
        const generation = advanceSessionGeneration();
        tokenRefreshManager.stop();
        try {
          const success = await authApi.loginUser({ mail, password });
          if (generation.aborted) return false;

          if (success) {
            log("Login successful");
            set((state) => ({
              isAuthenticated: true,
              user: { mail },
              sessionRevision: state.sessionRevision + 1,
              accountRevision: state.accountRevision + 1,
            }));

            if (tokenRefreshManager.isInitialized()) {
              tokenRefreshManager.start();
            }

            return true;
          }

          return false;
        } catch (error) {
          if (generation.aborted) return false;
          set({ isAuthenticated: false, user: null });
          throw error;
        }
      },

      logout: () => {
        advanceSessionGeneration();
        log("Logging out");
        tokenRefreshManager.stop();
        authApi.logout();
        set((state) => ({
          isAuthenticated: false,
          user: null,
          sessionRevision: state.sessionRevision + 1,
          accountRevision: state.accountRevision + 1,
        }));
      },

      setAuthenticated: () => {
        advanceSessionGeneration();
        tokenRefreshManager.stop();
        log("Setting authenticated");
        set((state) => ({
          isAuthenticated: true,
          sessionRevision: state.sessionRevision + 1,
          accountRevision: state.accountRevision + 1,
        }));

        if (tokenRefreshManager.isInitialized()) {
          tokenRefreshManager.start();
        }
      },

      initializeAuth: async () => {
        const generation = getSessionSignal();
        try {
          const accessToken = tokenStorage.getAccessToken();
          const refreshToken = tokenStorage.getRefreshToken();

          if (accessToken) {
            log("Access token found, setting authenticated");
            set((state) => ({
              isAuthenticated: true,
              sessionRevision: state.sessionRevision + 1,
              accountRevision: state.accountRevision + 1,
            }));

            if (tokenRefreshManager.isInitialized()) {
              tokenRefreshManager.start();
            }
          } else if (refreshToken) {
            log("Only refresh token found, attempting refresh");
            const refreshSuccess = await get().refreshToken();
            if (generation.aborted) return;

            set({
              isAuthenticated: refreshSuccess,
            });

            if (!refreshSuccess) {
              set({ user: null });
            }
          } else {
            log("No tokens found");
            set({
              isAuthenticated: false,
              user: null,
            });
          }
        } catch (error) {
          if (generation.aborted) return;
          console.error("Auth initialization failed:", serializeApiError(error));
          set({
            isAuthenticated: false,
            user: null,
          });
        } finally {
          if (!generation.aborted) set({ isInitialized: true });
        }
      },

      checkAuthStatus: () => {
        const accessToken = tokenStorage.getAccessToken();
        const isAuth = !!accessToken;

        if (get().isAuthenticated !== isAuth) {
          advanceSessionGeneration();
          tokenRefreshManager.stop();
          log(`Auth status changed: ${isAuth}`);
          set((state) => ({
            isAuthenticated: isAuth,
            sessionRevision: state.sessionRevision + 1,
            accountRevision: state.accountRevision + 1,
          }));
        }

        return isAuth;
      },

      refreshToken: () => {
        const generation = getSessionSignal();
        if (pendingRefresh?.generation === generation) return pendingRefresh.promise;
        const refreshToken = tokenStorage.getRefreshToken();
        log("Refreshing token...");

        const promise = (async () => {
          try {
            const accessToken = await authApi.refreshAccessToken(refreshToken);
            if (generation.aborted) return false;
            tokenStorage.saveTokens({ accessToken, refreshToken });
            log("Token refreshed successfully");
            set((state) => ({
              isAuthenticated: true,
              sessionRevision: state.sessionRevision + 1,
              accountRevision: state.isAuthenticated ? state.accountRevision : state.accountRevision + 1,
            }));
            if (!generation.aborted && tokenRefreshManager.isInitialized()) {
              tokenRefreshManager.reset();
            }
            return true;
          } catch (error) {
            if (generation.aborted) return false;
            console.error("Token refresh failed:", serializeApiError(error));
            set({ isAuthenticated: false, user: null });
            return false;
          }
        })();
        pendingRefresh = { generation, promise };
        void promise.finally(() => {
          if (pendingRefresh?.promise === promise) pendingRefresh = null;
        });
        return promise;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => createAuthStorage()),
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);

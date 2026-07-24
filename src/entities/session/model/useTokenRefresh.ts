"use client";

import { useEffect, useRef } from "react";
import { tokenRefreshManager, tokenStorage } from "@/shared/lib";
import { useAuthStore } from "./authStore";

export const useTokenRefresh = (): void => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;

    tokenRefreshManager.init({
      refreshToken,
      logout,
    });

    isInitializedRef.current = true;
  }, [refreshToken, logout]);

  useEffect(() => {
    if (!tokenRefreshManager.isInitialized()) return;

    if (isAuthenticated && tokenStorage.hasTokens()) {
      tokenRefreshManager.start();
    } else {
      tokenRefreshManager.stop();
    }
  }, [isAuthenticated]);
};

export const startTokenRefresh = (): void => {
  tokenRefreshManager.start();
};

export const stopTokenRefresh = (): void => {
  tokenRefreshManager.stop();
};

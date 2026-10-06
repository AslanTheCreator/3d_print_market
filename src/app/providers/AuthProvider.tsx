"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore, useTokenRefresh } from "@/entities/session";
import { registerAuthSessionAdapter } from "@/shared/api";

const expireSession = () => {
  useAuthStore.getState().logout();

  if (typeof window !== "undefined") {
    window.location.href = "/auth/login";
  }
};

registerAuthSessionAdapter({
  getSessionSignal: () => useAuthStore.getState().getSessionSignal(),
  refreshAccessToken: async () => {
    const signal = useAuthStore.getState().getSessionSignal();
    const success = await useAuthStore.getState().refreshToken();
    // Teardown cancels query waiters; expiry must not depend on a surviving request.
    if (!success && !signal.aborted) expireSession();
    return success;
  },
  onSessionExpired: expireSession,
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  // Инициализируем автоматическое обновление токенов
  useTokenRefresh();

  // Проверяем авторизацию при монтировании
  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}

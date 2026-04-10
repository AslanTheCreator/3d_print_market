"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/shared/lib/auth";
import { useTokenRefresh } from "@/shared/lib/token";

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

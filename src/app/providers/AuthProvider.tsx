"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/app/store";
import { useTokenRefresh } from "@/shared/lib/token";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const checkAuth = useAuthStore((state) => state.checkAuthStatus);

  // Инициализируем автоматическое обновление токенов
  useTokenRefresh();

  // Проверяем авторизацию при монтировании
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}

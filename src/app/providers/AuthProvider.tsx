"use client";

import { ReactNode, useEffect } from "react";
import { useCartQuantityStore } from "@/entities/cart";
import { useAuthStore } from "@/shared/lib/auth";
import { useTokenRefresh } from "@/shared/lib/token";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const clearCartQuantities = useCartQuantityStore(
    (state) => state.clearQuantities,
  );

  // Инициализируем автоматическое обновление токенов
  useTokenRefresh();

  // Проверяем авторизацию при монтировании
  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      clearCartQuantities();
    }
  }, [clearCartQuantities, isAuthenticated, isInitialized]);

  return <>{children}</>;
}

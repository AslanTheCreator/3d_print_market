/**
 * useTokenRefresh - хук для интеграции TokenRefreshManager в React
 *
 * Использование:
 * 1. Вызвать в корневом layout или AuthProvider
 * 2. Автоматически инициализирует проактивное обновление токенов
 *
 * @module shared/lib/token/useTokenRefresh
 */

"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/shared/lib/auth";
import { tokenRefreshManager } from "./tokenRefreshManager";
import { tokenStorage } from "./tokenStorage";

/**
 * Хук для инициализации и управления автоматическим обновлением токенов
 *
 * @example
 * // В layout.tsx или AuthProvider
 * export default function RootLayout({ children }) {
 *   useTokenRefresh();
 *   return <>{children}</>;
 * }
 */
export const useTokenRefresh = (): void => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);

  // Ref для предотвращения повторной инициализации
  const isInitializedRef = useRef(false);

  // Инициализация при монтировании
  useEffect(() => {
    if (isInitializedRef.current) return;

    tokenRefreshManager.init({
      refreshToken,
      logout,
    });

    isInitializedRef.current = true;

    // Cleanup при размонтировании (например, hot reload в dev)
    return () => {
      // Не уничтожаем менеджер полностью, только при необходимости
    };
  }, [refreshToken, logout]);

  // Реакция на изменение состояния авторизации
  useEffect(() => {
    if (!tokenRefreshManager.isInitialized()) return;

    if (isAuthenticated && tokenStorage.hasTokens()) {
      // Пользователь залогинился - запускаем таймер
      tokenRefreshManager.start();
    } else {
      // Пользователь вышел - останавливаем таймер
      tokenRefreshManager.stop();
    }
  }, [isAuthenticated]);
};

/**
 * Функция для ручного запуска refresh таймера
 * Вызывать после успешного логина/регистрации
 */
export const startTokenRefresh = (): void => {
  tokenRefreshManager.start();
};

/**
 * Функция для остановки refresh таймера
 * Вызывать при logout
 */
export const stopTokenRefresh = (): void => {
  tokenRefreshManager.stop();
};

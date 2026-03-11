/**
 * Axios Instances - настроенные HTTP клиенты
 *
 * Изменения:
 * - Исправлена функция isTokenExpiredError для обработки ЛЮБОГО 401
 * - Добавлен вызов tokenRefreshManager.reset() после успешного refresh
 * - Улучшено логирование
 *
 * @module shared/api/axios/instances
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "@/shared/lib";
import { useAuthStore } from "@/shared/lib/auth";
import {
  ApiError,
  BackendErrorResponse,
  transformToApiError,
  logApiError,
  ErrorCodes,
} from "@/shared/lib/errorHandler";
// Импорт tokenRefreshManager (добавить в shared/lib/index.ts)
import { tokenRefreshManager } from "@/shared/lib/token/tokenRefreshManager";

// ============================================================================
// ТИПЫ
// ============================================================================

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipErrorTransform?: boolean;
}

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

let cachedApiUrl: string | null = null;

// Mutex для предотвращения гонки при refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];
let refreshFailSubscribers: Array<(error: ApiError) => void> = [];

// ============================================================================
// ЛОГИРОВАНИЕ (только dev)
// ============================================================================

const log = (message: string, data?: unknown): void => {
  if (process.env.NODE_ENV !== "development") return;

  if (data !== undefined) {
    console.log(`[Axios] ${message}`, data);
  } else {
    console.log(`[Axios] ${message}`);
  }
};

const logError = (message: string, error?: unknown): void => {
  if (process.env.NODE_ENV !== "development") return;
  console.error(`[Axios] ${message}`, error);
};

// ============================================================================
// REFRESH TOKEN МЕХАНИЗМ
// ============================================================================

const subscribeToRefresh = (
  onSuccess: (token: string) => void,
  onError: (error: ApiError) => void,
): void => {
  refreshSubscribers.push(onSuccess);
  refreshFailSubscribers.push(onError);
};

const onRefreshSuccess = (newToken: string): void => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
  refreshFailSubscribers = [];
};

const onRefreshFailure = (error: ApiError): void => {
  refreshFailSubscribers.forEach((callback) => callback(error));
  refreshSubscribers = [];
  refreshFailSubscribers = [];
};

/**
 * ИСПРАВЛЕННАЯ ФУНКЦИЯ: Проверяет, нужно ли пытаться обновить токен
 *
 * Логика:
 * 1. Статус должен быть 401
 * 2. Должен быть refresh token для обновления
 * 3. Это НЕ запрос на сам refresh endpoint (избегаем бесконечного цикла)
 *
 * ВАЖНО: Мы больше НЕ проверяем конкретный код ошибки,
 * потому что когда токен отсутствует (cookie удалена), сервер
 * возвращает 401 БЕЗ кода TOKEN_INVALID_OR_EXPIRED
 */
const shouldAttemptRefresh = (
  error: AxiosError<BackendErrorResponse>,
  config: RetryableRequestConfig | undefined,
): boolean => {
  // Не 401 - не наш случай
  if (error.response?.status !== 401) {
    return false;
  }

  // Нет refresh токена - нечем обновлять
  if (!tokenStorage.canRefresh()) {
    log("No refresh token available, cannot attempt refresh");
    return false;
  }

  // Проверяем, что это не запрос на refresh endpoint (избегаем цикла)
  const isRefreshRequest = config?.url?.includes("/auth/refresh");
  if (isRefreshRequest) {
    log("This is a refresh request itself, not retrying");
    return false;
  }

  return true;
};

// ============================================================================
// ПОЛУЧЕНИЕ API URL
// ============================================================================

const getApiBaseUrl = async (): Promise<string> => {
  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  if (typeof window === "undefined") {
    const apiUrl = process.env.API_BASE_URL || "http://localhost:8081";
    cachedApiUrl = apiUrl;
    return apiUrl;
  }

  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    const apiUrl = config.apiUrl || "http://localhost:8081";
    cachedApiUrl = apiUrl;
    log("API URL loaded", apiUrl);
    return apiUrl;
  } catch (error) {
    logError("Failed to load API config", error);
    const fallbackUrl = "http://localhost:8081";
    cachedApiUrl = fallbackUrl;
    return fallbackUrl;
  }
};

// ============================================================================
// INTERCEPTORS
// ============================================================================

const setupUrlInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    async (config) => {
      const apiBaseUrl = await getApiBaseUrl();

      if (config.url) {
        const isFullUrl =
          config.url.startsWith("http://") || config.url.startsWith("https://");

        if (!isFullUrl) {
          const cleanUrl = config.url.replace(/^\/+/, "/");
          config.url = `${apiBaseUrl}${cleanUrl}`;
        }
      }

      return config;
    },
    (error) => Promise.reject(error),
  );
};

const setupErrorInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<BackendErrorResponse>) => {
      const config = error.config as RetryableRequestConfig | undefined;

      if (config?._skipErrorTransform) {
        return Promise.reject(error);
      }

      const apiError = transformToApiError(error);
      logApiError(apiError, config?.url);

      return Promise.reject(apiError);
    },
  );
};

const setupAuthInterceptor = (instance: AxiosInstance): void => {
  // REQUEST — добавляем токен
  instance.interceptors.request.use(
    (config) => {
      const token = tokenStorage.getAccessToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // RESPONSE — обрабатываем 401 и refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<BackendErrorResponse>) => {
      const originalRequest = error.config as RetryableRequestConfig;

      // Проверяем, нужно ли пытаться обновить токен
      if (
        !originalRequest ||
        !shouldAttemptRefresh(error, originalRequest) ||
        originalRequest._retry
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      log("401 detected, attempting token refresh...");

      // Если уже идёт refresh — становимся в очередь
      if (isRefreshing) {
        log("Refresh in progress, queuing request...");

        return new Promise((resolve, reject) => {
          subscribeToRefresh(
            (newToken: string) => {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
              resolve(instance(originalRequest));
            },
            (refreshError: ApiError) => {
              reject(refreshError);
            },
          );

          // Таймаут на случай зависания
          setTimeout(() => {
            reject(
              new ApiError(
                "Превышено время ожидания обновления токена",
                "REFRESH_TIMEOUT",
                408,
              ),
            );
          }, 10000);
        });
      }

      // Начинаем refresh
      isRefreshing = true;

      try {
        const authStore = useAuthStore.getState();
        const success = await authStore.refreshToken();

        if (success) {
          const newToken = tokenStorage.getAccessToken();

          if (newToken) {
            log("Token refreshed successfully via interceptor");

            // ВАЖНО: Сбрасываем таймер проактивного обновления
            tokenRefreshManager.reset();

            onRefreshSuccess(newToken);
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return instance(originalRequest);
          }
        }

        // Refresh не удался — logout
        log("Token refresh failed, logging out");
        const logoutError = new ApiError(
          "Сессия истекла",
          ErrorCodes.TOKEN_INVALID_OR_EXPIRED,
          401,
        );
        onRefreshFailure(logoutError);
        authStore.logout();

        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }

        return Promise.reject(logoutError);
      } catch (refreshError) {
        logError("Error during token refresh", refreshError);
        const apiError = transformToApiError(refreshError);
        onRefreshFailure(apiError);
        useAuthStore.getState().logout();

        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }

        return Promise.reject(apiError);
      } finally {
        isRefreshing = false;
      }
    },
  );
};

// ============================================================================
// СОЗДАНИЕ ИНСТАНСОВ
// ============================================================================

const createPublicAxios = (): AxiosInstance => {
  const instance = axios.create({
    timeout: 30000,
  });

  setupUrlInterceptor(instance);
  setupErrorInterceptor(instance);

  return instance;
};

const createAuthenticatedAxios = (): AxiosInstance => {
  const instance = axios.create({
    timeout: 30000,
  });

  // Порядок важен!
  setupUrlInterceptor(instance);
  setupAuthInterceptor(instance);
  setupErrorInterceptor(instance);

  return instance;
};

// ============================================================================
// ЭКСПОРТ
// ============================================================================

export const publicClient = createPublicAxios();
export const authClient = createAuthenticatedAxios();

export const preloadApiConfig = async (): Promise<void> => {
  await getApiBaseUrl();
};

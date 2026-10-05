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
  CanceledError,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "@/shared/lib";
import {
  serializeApiError,
  ApiError,
  BackendErrorResponse,
  transformToApiError,
  logApiError,
  ErrorCodes,
} from "@/shared/lib/errorHandler";
import { getServerApiBaseUrl, parseRuntimeApiUrl } from "@/shared/config/env";
import { getAuthSessionAdapter } from "./authSessionAdapter";

// ============================================================================
// ТИПЫ
// ============================================================================

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sessionSignal?: AbortSignal;
  _skipErrorTransform?: boolean;
}

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

let cachedApiUrl: string | null = null;
let pendingApiConfig: Promise<string> | null = null;
const API_CONFIG_TIMEOUT_MS = 10000;

// ============================================================================
// ЛОГИРОВАНИЕ (только dev)
// ============================================================================

const log = (message: string): void => {
  if (process.env.NODE_ENV !== "development") return;
  console.log(`[Axios] ${message}`);
};

const logError = (message: string, error?: unknown): void => {
  if (process.env.NODE_ENV !== "development") return;
  console.error(`[Axios] ${message}`, serializeApiError(error));
};

// ============================================================================
// REFRESH TOKEN МЕХАНИЗМ
// ============================================================================

const assertRequestActive = (config: RetryableRequestConfig): void => {
  if (config.signal?.aborted || config._sessionSignal?.aborted) {
    throw new CanceledError("Запрос отменён", config);
  }
};

type RefreshResult = { success: boolean } | { error: unknown };
type RefreshSubscriber = (result: RefreshResult) => void;
const refreshWaiters = new WeakMap<Promise<boolean>, Set<RefreshSubscriber>>();

const subscribeToRefresh = (
  refresh: Promise<boolean>,
  subscriber: RefreshSubscriber,
): (() => void) => {
  const existing = refreshWaiters.get(refresh);
  const subscribers = existing ?? new Set<RefreshSubscriber>();
  if (!existing) {
    refreshWaiters.set(refresh, subscribers);
    const notify = (result: RefreshResult) => {
      subscribers.forEach((callback) => callback(result));
      subscribers.clear();
      refreshWaiters.delete(refresh);
    };
    void refresh.then((success) => notify({ success }), (error) => notify({ error }));
  }
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
};

// Leader и очередь имеют одинаковое терминальное состояние ожидания.
const waitForRefresh = (
  refresh: Promise<boolean>,
  config: RetryableRequestConfig,
): Promise<boolean> => new Promise((resolve, reject) => {
  let settled = false;
  let unsubscribe: (() => void) | undefined;
  const finish = (error?: unknown, success?: boolean) => {
    if (settled) return;
    settled = true;
    unsubscribe?.();
    clearTimeout(timer);
    config.signal?.removeEventListener?.("abort", cancel);
    config._sessionSignal?.removeEventListener("abort", cancel);
    if (error) reject(error);
    else resolve(success ?? false);
  };
  const cancel = () => finish(new CanceledError("Запрос отменён", config));
  const timer = setTimeout(() => finish(new ApiError(
    "Превышено время ожидания обновления токена", "REFRESH_TIMEOUT", 408,
  )), 10000);
  config.signal?.addEventListener?.("abort", cancel);
  config._sessionSignal?.addEventListener("abort", cancel);
  unsubscribe = subscribeToRefresh(refresh, (result) => {
    if ("error" in result) finish(result.error);
    else finish(undefined, result.success);
  });
  if (config.signal?.aborted || config._sessionSignal?.aborted) cancel();
});

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

const loadApiBaseUrl = async (): Promise<string> => {
  if (typeof window === "undefined") {
    return getServerApiBaseUrl();
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ApiError("Превышено время загрузки конфигурации API", "TIMEOUT", 408));
      controller.abort();
    }, API_CONFIG_TIMEOUT_MS);
  });
  try {
    const apiUrl = await Promise.race([
      (async () => {
        const response = await fetch("/api/config", { signal: controller.signal });
        if (!response.ok) {
          throw new ApiError("Не удалось загрузить конфигурацию API", undefined, response.status);
        }
        const config: unknown = await response.json();
        return parseRuntimeApiUrl(
          typeof config === "object" && config !== null && "apiUrl" in config
            ? config.apiUrl : undefined,
        );
      })(),
      deadline,
    ]);
    log("API URL loaded");
    return apiUrl;
  } catch (error) {
    logError("Failed to load API config", error);

    if (process.env.NODE_ENV !== "production") {
      return getServerApiBaseUrl();
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const getApiBaseUrl = (): Promise<string> => {
  if (cachedApiUrl) return Promise.resolve(cachedApiUrl);
  if (!pendingApiConfig) {
    pendingApiConfig = loadApiBaseUrl().then((apiUrl) => {
      cachedApiUrl = apiUrl;
      return apiUrl;
    }, (error: unknown) => {
      throw transformToApiError(error);
    }).finally(() => {
      pendingApiConfig = null;
    });
  }
  return pendingApiConfig;
};

const getRequestApiBaseUrl = (config: RetryableRequestConfig): Promise<string> => {
  assertRequestActive(config);
  const pending = getApiBaseUrl();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      config.signal?.removeEventListener?.("abort", cancel);
      config._sessionSignal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      cleanup();
      reject(new CanceledError("Запрос отменён", config));
    };
    config.signal?.addEventListener?.("abort", cancel);
    config._sessionSignal?.addEventListener("abort", cancel);
    void pending.then((apiUrl) => {
      cleanup();
      resolve(apiUrl);
    }, (error: unknown) => {
      cleanup();
      reject(error);
    });
    if (config.signal?.aborted || config._sessionSignal?.aborted) cancel();
  });
};

// ============================================================================
// INTERCEPTORS
// ============================================================================

const setupUrlInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    async (config) => {
      const apiBaseUrl = await getRequestApiBaseUrl(config);
      assertRequestActive(config);
      config.baseURL = apiBaseUrl;

      return config;
    },
    (error) => Promise.reject(error),
  );
};

const setupErrorInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<BackendErrorResponse>) => {
      // Отмена query при смене страницы/сессии — не ошибка backend.
      if (axios.isCancel(error)) return Promise.reject(error);
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
    (config: RetryableRequestConfig) => {
      config._sessionSignal ??= getAuthSessionAdapter()?.getSessionSignal();
      assertRequestActive(config);
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

      assertRequestActive(originalRequest);
      const adapter = getAuthSessionAdapter();
      if (!adapter) {
        throw new ApiError("Сессия не инициализирована", ErrorCodes.TOKEN_INVALID_OR_EXPIRED, 401);
      }
      let success: boolean;
      try {
        success = await waitForRefresh(adapter.refreshAccessToken(), originalRequest);
      } catch (refreshError) {
        assertRequestActive(originalRequest);
        if (axios.isCancel(refreshError) ||
            (refreshError instanceof ApiError && refreshError.code === "REFRESH_TIMEOUT")) {
          throw refreshError;
        }
        logError("Error during token refresh", refreshError);
        adapter.onSessionExpired();
        throw transformToApiError(refreshError);
      }
      assertRequestActive(originalRequest);
      const newToken = tokenStorage.getAccessToken();
      if (!success || !newToken) {
        adapter.onSessionExpired();
        throw new ApiError("Сессия истекла", ErrorCodes.TOKEN_INVALID_OR_EXPIRED, 401);
      }
      originalRequest.headers["Authorization"] = "Bearer " + newToken;
      return instance(originalRequest);
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

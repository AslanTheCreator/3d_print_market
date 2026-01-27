import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "@/shared/lib";
import { useAuthStore } from "@/app/store";
import {
  ApiError,
  BackendErrorResponse,
  transformToApiError,
  logApiError,
  ErrorCodes,
} from "@/shared/lib/errorHandler";

// ============================================================================
// ТИПЫ
// ============================================================================

/**
 * Расширяем конфиг для retry флага (используется при refresh token)
 */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipErrorTransform?: boolean; // Флаг для пропуска трансформации (например, для refresh)
}

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

// Кеш для API URL
let cachedApiUrl: string | null = null;

// Состояние refresh процесса (mutex для предотвращения гонки)
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];
let refreshFailSubscribers: Array<(error: ApiError) => void> = [];

// ============================================================================
// УТИЛИТЫ ЛОГИРОВАНИЯ (только dev)
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

/**
 * Подписка на завершение refresh (для очереди запросов)
 */
const subscribeToRefresh = (
  onSuccess: (token: string) => void,
  onError: (error: ApiError) => void,
): void => {
  refreshSubscribers.push(onSuccess);
  refreshFailSubscribers.push(onError);
};

/**
 * Уведомление подписчиков об успешном refresh
 */
const onRefreshSuccess = (newToken: string): void => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
  refreshFailSubscribers = [];
};

/**
 * Уведомление подписчиков об ошибке refresh
 */
const onRefreshFailure = (error: ApiError): void => {
  refreshFailSubscribers.forEach((callback) => callback(error));
  refreshSubscribers = [];
  refreshFailSubscribers = [];
};

/**
 * Проверяет, является ли ошибка "токен истёк"
 */
const isTokenExpiredError = (
  error: AxiosError<BackendErrorResponse>,
): boolean => {
  return (
    error.response?.status === 401 &&
    error.response?.data?.code === ErrorCodes.TOKEN_INVALID_OR_EXPIRED
  );
};

// ============================================================================
// ПОЛУЧЕНИЕ API URL
// ============================================================================

const getApiBaseUrl = async (): Promise<string> => {
  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  // На сервере (SSR) — из переменной окружения
  if (typeof window === "undefined") {
    const apiUrl = process.env.API_BASE_URL || "http://localhost:8081";
    cachedApiUrl = apiUrl;
    return apiUrl;
  }

  // На клиенте — через API endpoint
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

/**
 * Interceptor для добавления базового URL к запросам
 */
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

/**
 * ГЛАВНЫЙ ERROR INTERCEPTOR
 * Централизованная обработка всех ошибок:
 * 1. Трансформирует AxiosError → ApiError
 * 2. Логирует в dev режиме (один раз!)
 * 3. Пробрасывает ApiError дальше
 */
const setupErrorInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    // Success — просто пробрасываем
    (response) => response,

    // Error — трансформируем и логируем
    (error: AxiosError<BackendErrorResponse>) => {
      const config = error.config as RetryableRequestConfig | undefined;

      // Пропускаем трансформацию если флаг установлен (внутренние запросы)
      if (config?._skipErrorTransform) {
        return Promise.reject(error);
      }

      // Трансформируем в ApiError
      const apiError = transformToApiError(error);

      // Логируем один раз централизованно
      logApiError(apiError, config?.url);

      // Пробрасываем уже как ApiError
      return Promise.reject(apiError);
    },
  );
};

/**
 * Auth Interceptor для авторизованных запросов
 * - Request: добавляет токен
 * - Response: обрабатывает 401 и refresh token
 */
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

      // Проверяем условия для refresh:
      // 1. Есть конфиг запроса
      // 2. Это ошибка "токен истёк"
      // 3. Запрос ещё не повторялся
      if (
        !originalRequest ||
        !isTokenExpiredError(error) ||
        originalRequest._retry
      ) {
        // Не наш случай — пробрасываем дальше (error interceptor обработает)
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      log("Token expired, attempting refresh...");

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
            log("Token refreshed successfully");
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

        // Редирект на логин (только на клиенте)
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

/**
 * Создаёт публичный axios инстанс (без авторизации)
 * Используется для: регистрация, логин, публичные данные
 */
const createPublicAxios = (): AxiosInstance => {
  const instance = axios.create({
    timeout: 30000, // 30 секунд
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Порядок важен!
  setupUrlInterceptor(instance);
  setupErrorInterceptor(instance); // Трансформация ошибок в ApiError

  return instance;
};

/**
 * Создаёт приватный axios инстанс (с авторизацией)
 * Используется для: все защищённые эндпоинты
 */
const createAuthenticatedAxios = (): AxiosInstance => {
  const instance = axios.create({
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Порядок важен!
  setupUrlInterceptor(instance);
  setupAuthInterceptor(instance); // Добавление токена + refresh
  setupErrorInterceptor(instance); // Трансформация ошибок в ApiError

  return instance;
};

// ============================================================================
// ЭКСПОРТ
// ============================================================================

export const publicClient = createPublicAxios();
export const authClient = createAuthenticatedAxios();

/**
 * Предзагрузка конфига API (опционально, для ускорения первого запроса)
 */
export const preloadApiConfig = async (): Promise<void> => {
  await getApiBaseUrl();
};

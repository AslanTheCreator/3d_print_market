import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "@/shared/lib";
import { useAuthStore } from "@/app/store";

// Типы для ошибок от бэкенда
interface ApiErrorResponse {
  code?: string;
  message?: string;
  status?: number;
  timestamp?: string;
  details?: unknown;
}

// Расширяем конфиг для retry флага
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Кеш для API URL
let cachedApiUrl: string | null = null;

// Состояние refresh процесса (mutex)
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// Подписка на завершение refresh
const subscribeToRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Уведомление подписчиков о новом токене
const onRefreshSuccess = (newToken: string) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

// Очистка подписчиков при ошибке
const onRefreshFailure = () => {
  refreshSubscribers = [];
};

// Проверка, является ли ошибка "токен истёк"
const isTokenExpiredError = (error: AxiosError<ApiErrorResponse>): boolean => {
  return (
    error.response?.status === 401 &&
    error.response?.data?.code === "TOKEN_INVALID_OR_EXPIRED"
  );
};

// Логирование только в development
const log = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === "development") {
    if (data) {
      console.log(`[Auth] ${message}`, data);
    } else {
      console.log(`[Auth] ${message}`);
    }
  }
};

const logError = (message: string, error?: unknown) => {
  if (process.env.NODE_ENV === "development") {
    console.error(`[Auth] ${message}`, error);
  }
};

// Функция получения API URL из конфига
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
    return apiUrl;
  } catch (error) {
    logError("Failed to load API config", error);
    const fallbackUrl = "http://localhost:8081";
    cachedApiUrl = fallbackUrl;
    return fallbackUrl;
  }
};

// Общий interceptor для обработки URL
const setupUrlInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    async (config) => {
      const apiBaseUrl = await getApiBaseUrl();

      if (config.url) {
        const isFullUrl =
          config.url.startsWith("http://") || config.url.startsWith("https://");

        if (isFullUrl) {
          return config;
        }

        let cleanUrl = config.url.replace(/^\/+/, "/");
        config.url = `${apiBaseUrl}${cleanUrl}`;
      }

      return config;
    },
    (error) => Promise.reject(error),
  );
};

// Общий error interceptor (для publicClient)
const setupErrorInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      logError("Response error", {
        url: error.config?.url,
        status: error.response?.status,
        code: error.response?.data?.code,
        message: error.response?.data?.message,
      });
      return Promise.reject(error);
    },
  );
};

// Auth interceptor для авторизованных запросов
const setupAuthInterceptor = (instance: AxiosInstance) => {
  // Request — добавляем токен
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

  // Response — обрабатываем 401 и refresh token
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiErrorResponse>) => {
      const originalRequest = error.config as RetryableRequestConfig;

      // Проверяем: это ошибка "токен истёк" и запрос ещё не повторялся
      if (
        !originalRequest ||
        !isTokenExpiredError(error) ||
        originalRequest._retry
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      log("Token expired, attempting refresh...");

      // Если уже идёт refresh — ждём его завершения
      if (isRefreshing) {
        log("Refresh already in progress, waiting...");
        return new Promise((resolve, reject) => {
          subscribeToRefresh((newToken: string) => {
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            resolve(instance(originalRequest));
          });
          // Таймаут на случай если refresh зависнет
          setTimeout(() => {
            reject(new Error("Refresh token timeout"));
          }, 10000);
        });
      }

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
        onRefreshFailure();
        authStore.logout();

        // Редирект на логин (только на клиенте)
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }

        return Promise.reject(error);
      } catch (refreshError) {
        logError("Error during token refresh", refreshError);
        onRefreshFailure();
        useAuthStore.getState().logout();

        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
};

// Создаем публичный axios инстанс
const createPublicAxios = (): AxiosInstance => {
  const instance = axios.create();
  setupUrlInterceptor(instance);
  setupErrorInterceptor(instance);
  return instance;
};

// Создаем приватный axios инстанс (с авторизацией)
const createAuthenticatedAxios = (): AxiosInstance => {
  const instance = axios.create();
  setupUrlInterceptor(instance);
  setupAuthInterceptor(instance);
  return instance;
};

// Экспортируем готовые инстансы
export const publicClient = createPublicAxios();
export const authClient = createAuthenticatedAxios();

// Экспортируем функцию для предзагрузки конфига
export const preloadApiConfig = async () => {
  await getApiBaseUrl();
};

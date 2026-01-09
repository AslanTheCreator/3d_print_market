import axios, { AxiosInstance } from "axios";
import { tokenStorage } from "@/shared/lib";
import { useAuthStore } from "@/app/store";

// Кеш для API URL
let cachedApiUrl: string | null = null;

// Функция получения API URL из конфига
const getApiBaseUrl = async (): Promise<string> => {
  // Если уже загружен, возвращаем из кеша
  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  // На сервере берем из переменной окружения (Docker internal URL)
  if (typeof window === "undefined") {
    const apiUrl = process.env.API_BASE_URL || "http://localhost:8081";
    cachedApiUrl = apiUrl;
    console.log("[Server] API URL:", apiUrl);
    return apiUrl;
  }

  // На клиенте получаем через API endpoint (Public URL)
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    const apiUrl = config.apiUrl || "http://localhost:8081";
    cachedApiUrl = apiUrl;
    console.log("[Client] API URL:", apiUrl);
    return apiUrl;
  } catch (error) {
    console.error("Failed to load API config:", error);
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
        // Проверяем, это внешний URL или относительный
        const isFullUrl =
          config.url.startsWith("http://") || config.url.startsWith("https://");

        // Если это уже полный URL - не трогаем
        if (isFullUrl) {
          console.log("[Interceptor] Full URL detected, skipping:", config.url);
          return config;
        }

        // Для относительных URL добавляем базовый URL
        let cleanUrl = config.url;

        // Убираем лишние слеши в начале
        cleanUrl = cleanUrl.replace(/^\/+/, "/");

        // Формируем финальный URL
        const finalUrl = `${apiBaseUrl}${cleanUrl}`;
        config.url = finalUrl;

        console.log("[Interceptor] Request URL:", finalUrl);
      }

      return config;
    },
    (error) => {
      console.error("[Interceptor] Request error:", error);
      return Promise.reject(error);
    }
  );
};

// Общий error interceptor
const setupErrorInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (response) => {
      console.log(
        "[Interceptor] Response success:",
        response.config.url,
        response.status
      );
      return response;
    },
    (error) => {
      console.error("[Interceptor] Response error:", {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
      return Promise.reject(error);
    }
  );
};

// Auth interceptor для авторизованных запросов
const setupAuthInterceptor = (instance: AxiosInstance) => {
  // Request - добавляем токен
  instance.interceptors.request.use(
    (config) => {
      const token = tokenStorage.getAccessToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
        console.log("[Auth] Token added to request");
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response - обрабатываем 401 и refresh token
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        console.log("[Auth] 401 detected, attempting token refresh...");

        try {
          const authStore = useAuthStore.getState();
          const success = await authStore.refreshToken();

          if (success) {
            const newToken = tokenStorage.getAccessToken();
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            console.log("[Auth] Token refreshed, retrying request");
            return instance(originalRequest);
          } else {
            console.log("[Auth] Token refresh failed, logging out");
            authStore.logout();
            return Promise.reject(error);
          }
        } catch (refreshError) {
          console.error("[Auth] Error refreshing token:", refreshError);
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
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
  setupErrorInterceptor(instance);
  return instance;
};

// Экспортируем готовые инстансы
export const publicClient = createPublicAxios();
export const authClient = createAuthenticatedAxios();

// Экспортируем функцию для предзагрузки конфига (опционально)
export const preloadApiConfig = async () => {
  await getApiBaseUrl();
};

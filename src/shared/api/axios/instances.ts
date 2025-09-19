import axios, { AxiosInstance } from "axios";
import { tokenStorage } from "@/shared/lib/token/tokenStorage";
import { useAuthStore } from "@/app/store";
import { getConfig, isLoaded, loadConfig } from "@/shared/config/index";

// Общий interceptor для обработки URL
const setupUrlInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    async (config) => {
      if (!isLoaded()) {
        await loadConfig();
      }

      const appConfig = getConfig();

      if (config.url) {
        const isExternalUrl =
          config.url.startsWith("http") &&
          !config.url.includes("localhost") &&
          !config.url.includes("127.0.0.1");

        if (!isExternalUrl) {
          let cleanUrl = config.url;
          if (cleanUrl.includes("localhost:8081")) {
            cleanUrl = cleanUrl.replace(/https?:\/\/localhost:8081/, "");
          }

          if (!cleanUrl.startsWith("/")) {
            cleanUrl = "/" + cleanUrl;
          }

          config.url = `${appConfig.apiBaseUrl}${cleanUrl}`;
          console.log("Axios interceptor: redirecting to", config.url);
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );
};

// Общий error interceptor
const setupErrorInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error("API Error:", error.config?.url, error.response?.status);
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
        try {
          const authStore = useAuthStore.getState();
          const success = await authStore.refreshToken();

          if (success) {
            const newToken = tokenStorage.getAccessToken();
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return instance(originalRequest);
          } else {
            authStore.logout();
            return Promise.reject(error);
          }
        } catch (refreshError) {
          console.log("Error refreshing token:", refreshError);
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
export const publicApi = createPublicAxios();
export const authApi = createAuthenticatedAxios();

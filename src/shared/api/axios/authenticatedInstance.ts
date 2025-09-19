import axios from "axios";
import { tokenStorage } from "@/shared/lib/token/tokenStorage";
import { useAuthStore } from "@/app/store";
import { getConfig, isLoaded, loadConfig } from "@/shared/config/index";

export const createAuthenticatedAxiosInstance = () => {
  const axiosInstance = axios.create();

  // Добавляем тот же URL interceptor, что и в глобальном
  axiosInstance.interceptors.request.use(
    async (config) => {
      // Сначала обрабатываем URL (как в глобальном interceptor)
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
          console.log(
            "Authenticated axios interceptor: redirecting to",
            config.url
          );
        }
      }

      // Затем добавляем токен авторизации
      const token = tokenStorage.getAccessToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  axiosInstance.interceptors.response.use(
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
            return axiosInstance(originalRequest);
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

      // Добавляем логирование ошибок (как в глобальном interceptor)
      console.error(
        "Authenticated API Error:",
        error.config?.url,
        error.response?.status
      );
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

export const authenticatedAxios = createAuthenticatedAxiosInstance();

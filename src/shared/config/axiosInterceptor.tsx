import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getConfig, isLoaded, loadConfig } from "@/shared/config/index";

let isInterceptorSetup = false;

export const setupAxiosInterceptor = () => {
  if (isInterceptorSetup) return;

  // Request interceptor для автоматической подстановки правильного baseURL
  axios.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Если конфиг еще не загружен, загружаем его
      if (!isLoaded()) {
        await loadConfig();
      }

      const appConfig = getConfig();

      // Если URL относительный или содержит localhost, заменяем на правильный baseURL
      if (config.url) {
        // Проверяем, не является ли это полным URL к внешнему сервису
        const isExternalUrl =
          config.url.startsWith("http") &&
          !config.url.includes("localhost") &&
          !config.url.includes("127.0.0.1");

        if (!isExternalUrl) {
          // Убираем localhost из URL если он есть
          let cleanUrl = config.url;
          if (cleanUrl.includes("localhost:8081")) {
            cleanUrl = cleanUrl.replace(/https?:\/\/localhost:8081/, "");
          }

          // Добавляем правильный baseURL
          if (!cleanUrl.startsWith("/")) {
            cleanUrl = "/" + cleanUrl;
          }

          config.url = `${appConfig.apiBaseUrl}${cleanUrl}`;

          console.log("Axios interceptor: redirecting to", config.url);
        }
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor для обработки ошибок
  axios.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      console.error("API Error:", error.config?.url, error.response?.status);
      return Promise.reject(error);
    }
  );

  isInterceptorSetup = true;
};

// Инициализируем интерцепторы сразу при импорте
if (typeof window !== "undefined") {
  setupAxiosInterceptor();
}

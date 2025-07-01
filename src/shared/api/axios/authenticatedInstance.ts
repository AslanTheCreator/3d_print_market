import axios from "axios";
import { tokenStorage } from "@/shared/lib/token/tokenStorage";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/shared/store/authStore";

export const createAuthenticatedAxiosInstance = () => {
  const axiosInstance = axios.create();

  axiosInstance.interceptors.request.use(
    async (config) => {
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
            // Если обновление не удалось, делаем logout
            authStore.logout();
            return Promise.reject(error);
          }
        } catch (refreshError) {
          // При ошибке обновления токена делаем logout
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

export const authenticatedAxios = createAuthenticatedAxiosInstance();

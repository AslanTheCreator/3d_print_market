import axios from "axios";
import { tokenStorage } from "@/shared/lib/token/tokenStorage";
import { authApi } from "@/features/auth/api/authApi";

export const createAuthenticatedAxiosInstance = () => {
  const axiosInstance = axios.create();

  axiosInstance.interceptors.request.use(
    async (config) => {
      tokenStorage.saveTokens({
        accessToken:
          "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpZCI6IjEwMSIsImxvZ2luIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiZnVsbE5hbWUiOiJhZG1pbiIsImltYWdlSWQiOjkwLCJyb2xlIjoiQURNSU4ifQ.ZbdpqY50gIbEHr7o60s4Pc9VkHxBD2xwQGnzCTQDohOOUDj5HDZIdHIGsXeopWzucUIIDnODGwWQt-PlponPx4FJ5td3N_2FdwxmY39ffWeD51Xfiqxztd1eorsbRRHGdFCOLcT09O4kj1YrlUss2-Oluf0IfAzVw3G_1M3oC72cnl7pKBhhpDIgb96VCdPwlZkGx3QS1-v0Ryq8Ds9E-FNWIQFc1ctGHE5Uj0zqwhe825sT7AnPxHmW58zxcl0Cj5zjP437hlhze4k82zkVU_i7YvAMnbjMP3WU2nGRp71KeqFj078-2WNTgzQt3btK-C5S9GH9L3EVW9hXaljNaw",
        refreshToken: "",
      });
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
          const newToken = await authApi.refreshAccessToken();
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

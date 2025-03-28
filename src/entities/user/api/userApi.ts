import axios from "axios";
import config from "@/shared/config/api";
import { User } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";

const API_URL = `${config.apiBaseUrl}/participant`;

export const userApi = {
  async getUser(): Promise<User> {
    const authenticatedAxios = createAuthenticatedAxiosInstance();
    try {
      const { data } = await authenticatedAxios.get<User>(API_URL);
      if (!data) {
        throw new Error("Пустой ответ от сервера");
      }
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        " Ошибка при загрузке пользователя"
      );
    }
  },
};

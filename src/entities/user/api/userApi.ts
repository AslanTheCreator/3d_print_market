import axios from "axios";
import config from "@/shared/config/api";
import { User } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";

const API_URL = `${config.apiBaseUrl}/participant`;

export const userApi = {
  async getUser(token: string): Promise<User> {
    try {
      const { data } = await axios.get<User>(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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

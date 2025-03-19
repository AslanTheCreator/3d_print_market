import axios, { AxiosError } from "axios";
import config from "@/shared/config/api";
import { User } from "../model/types";

export const fetchUser = async (token: string): Promise<User> => {
  try {
    const { data } = await axios.get<User>(`${config.apiBaseUrl}/participant`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!data) {
      throw new Error("Пустой ответ от сервера");
    }
    return data;
  } catch (error) {
    console.error("Ошибка при получении пользователя:", error);
    throw error;
  }
};

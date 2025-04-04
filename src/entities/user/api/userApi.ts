import config from "@/shared/config/api";
import {
  UserBaseModel,
  UserProfileModel,
  UserUpdateModel,
} from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";

const API_URL = `${config.apiBaseUrl}/participant`;
const API_URL_PROFILE = `${config.apiBaseUrl}/auth/profile`;

const authenticatedAxios = createAuthenticatedAxiosInstance();

export const userApi = {
  async getUser(): Promise<UserBaseModel> {
    try {
      const { data } = await authenticatedAxios.get<UserBaseModel>(API_URL);
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
  async getProfileUser() {
    try {
      const { data } = await authenticatedAxios.get<UserProfileModel>(
        API_URL_PROFILE
      );
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        " Ошибка при загрузке профиля пользователя"
      );
    }
  },
  async updateUser(userData: UserUpdateModel) {
    try {
      const { data } = await authenticatedAxios.put<UserUpdateModel>(
        API_URL,
        {
          userData,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!data) {
        throw new Error("Пустой ответ от сервера");
      }
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        " Ошибка при обновлении пользователя"
      );
    }
  },
};

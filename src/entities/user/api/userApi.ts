import config from "@/shared/config/api";
import {
  UserBaseModel,
  UserFindModel,
  UserProfileModel,
  UserUpdateModel,
} from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { imageApi } from "@/entities/image/api/imageApi";
import axios from "axios";

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
  async getUserByParams(id?: number): Promise<UserFindModel[]> {
    try {
      const { data } = await axios.post<UserFindModel[]>(
        `${config.apiBaseUrl}/participants/find`,
        {
          id,
        }
      );
      console.log(data);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        " Ошибка при загрузке пользователя по параметрам"
      );
    }
  },
  async getProfileUser() {
    try {
      const { data } = await authenticatedAxios.get<UserProfileModel>(
        API_URL_PROFILE
      );

      const image = await imageApi.getImages(data.imageId);
      return { ...data, image: image };
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

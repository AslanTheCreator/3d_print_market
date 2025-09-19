import {
  UserBaseModel,
  UserFindModel,
  UserProfileModel,
  UserUpdateModel,
} from "../model/types";
import { errorHandler } from "@/shared/lib/error-handler";
import { imageApi } from "@/entities/image/api/imageApi";
import { authApi, publicApi } from "@/shared/api";

const API_URL = `/participant`;
const API_URL_FIND = `/participants/find`;
const API_URL_PROFILE = `/auth/profile`;

export const userApi = {
  async getUser(): Promise<UserBaseModel> {
    try {
      const { data } = await authApi.get<UserBaseModel>(API_URL);
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
      const { data } = await publicApi.post<UserFindModel[]>(API_URL_FIND, {
        id,
      });
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
      const { data } = await authApi.get<UserProfileModel>(API_URL_PROFILE);

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
      const { data } = await authApi.put<number>(
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
      console.log("Пользователь успешно обновлен: ", data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        " Ошибка при обновлении пользователя"
      );
    }
  },
};

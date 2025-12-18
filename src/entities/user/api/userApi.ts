import {
  UserBaseModel,
  UserFindModel,
  UserProfileModel,
  UserUpdateModel,
} from "../model/types";
import { errorHandler } from "@/shared/lib";
import { imageApi, ImageResponse } from "@/entities/image";
import { authApi, publicApi } from "@/shared/api";

const API_URL = `/participant`;
const API_URL_FIND = `/participants/find`;
const API_URL_PROFILE = `/auth/profile`;

export const userApi = {
  async getUser(): Promise<UserBaseModel> {
    const { data } = await authApi.get<UserBaseModel>(API_URL);
    const images = await imageApi.getImages(data.imageIds);
    return { ...data, image: images };
  },
  async getUserByParams(id?: number): Promise<UserFindModel[]> {
    const { data } = await publicApi.post<UserFindModel[]>(API_URL_FIND, {
      id,
    });
    return data ?? [];
  },
  async getProfileUser(): Promise<
    UserProfileModel & { image: ImageResponse[] }
  > {
    const { data } = await authApi.get<UserProfileModel>(API_URL_PROFILE);
    const image = await imageApi.getImages(data.imageId);
    return { ...data, image: image };
  },
  async updateUser(userData: UserUpdateModel): Promise<number> {
    try {
      const { data } = await authApi.put<number>(API_URL, userData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        " Ошибка при обновлении пользователя"
      );
    }
  },
};

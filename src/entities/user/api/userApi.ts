import {
  UserBaseModel,
  UserFindModel,
  UserProfileModel,
  UserUpdateModel,
} from "../model/types";
import { imageApi, ImageResponse } from "@/entities/image";
import { authClient, publicClient } from "@/shared/api";

const API_URL = `/participant`;
const API_URL_FIND = `/participants/find`;
const API_URL_PROFILE = `/auth/profile`;

export const userApi = {
  async getUser(): Promise<UserBaseModel> {
    const { data } = await authClient.get<UserBaseModel>(API_URL);
    const images = data.imageId ? await imageApi.getImages(data.imageId) : [];
    return { ...data, image: images };
  },
  async getUserByParams(id?: number): Promise<UserFindModel[]> {
    const { data } = await publicClient.post<UserFindModel[]>(API_URL_FIND, {
      id,
    });
    return data ?? [];
  },
  async getProfileUser(): Promise<
    UserProfileModel & { image: ImageResponse[] }
  > {
    const { data } = await authClient.get<UserProfileModel>(API_URL_PROFILE);
    const image = data.imageId ? await imageApi.getImages(data.imageId) : [];
    return { ...data, image: image };
  },
  async updateUser(userData: UserUpdateModel): Promise<number> {
    const { data } = await authClient.put<number>(API_URL, userData, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return data;
  },
  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    await authClient.put(`${API_URL}/password`, null, {
      params: { oldPassword, newPassword },
    });
  },
};

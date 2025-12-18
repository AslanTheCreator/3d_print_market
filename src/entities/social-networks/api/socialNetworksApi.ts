import { SocialNetworksCreateModel, SocialNetworksModel } from "../model/types";
import { authApi } from "@/shared/api";

const API_URL = `/social-networks`;

export const socialNetworksApi = {
  getSocialNetworks: async (): Promise<SocialNetworksModel[]> => {
    const { data } = await authApi.get<SocialNetworksModel[]>(API_URL);
    return data;
  },
  createSocialNetwork: async (
    data: SocialNetworksCreateModel
  ): Promise<void> => {
    await authApi.post(API_URL, data);
  },
  deleteSocialNetwork: async (id: number): Promise<void> => {
    await authApi.delete(`${API_URL}/${id}`);
  },
};

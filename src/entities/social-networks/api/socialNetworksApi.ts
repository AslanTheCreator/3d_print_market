import { SocialNetworksCreateModel, SocialNetworksModel } from "../model/types";
import { authClient } from "@/shared/api";

const API_URL = `/social-networks`;

export const socialNetworksApi = {
  getSocialNetworks: async (): Promise<SocialNetworksModel[]> => {
    const { data } = await authClient.get<SocialNetworksModel[]>(API_URL);
    return data;
  },
  createSocialNetwork: async (
    data: SocialNetworksCreateModel
  ): Promise<void> => {
    await authClient.post(API_URL, data);
  },
  deleteSocialNetwork: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};

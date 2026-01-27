import { SocialNetworks, SocialNetworksInput } from "../model/types";
import { authClient } from "@/shared/api";

const API_URL = `/social-networks`;

export const socialNetworksApi = {
  getSocialNetworks: async (): Promise<SocialNetworks[]> => {
    const { data } = await authClient.get<SocialNetworks[]>(API_URL);
    return data;
  },
  createSocialNetwork: async (data: SocialNetworksInput): Promise<void> => {
    await authClient.post(API_URL, data);
  },
  update: async (
    id: number,
    input: SocialNetworksInput,
  ): Promise<SocialNetworks> => {
    const { data } = await authClient.put<SocialNetworks>(
      `${API_URL}/${id}`,
      input,
    );
    return data;
  },
  deleteSocialNetwork: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};

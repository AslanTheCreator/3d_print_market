import { authClient } from "@/shared/api";
import type { SocialNetwork } from "@/shared/types";
import type { SocialNetworkInput } from "../model/types";

const API_URL = "/social-networks";

export const socialNetworksApi = {
  getAll: async (): Promise<SocialNetwork[]> => {
    const { data } = await authClient.get<SocialNetwork[]>(API_URL);
    return data;
  },

  create: async (input: SocialNetworkInput): Promise<void> => {
    await authClient.post(API_URL, input);
  },

  update: async (
    id: number,
    input: SocialNetworkInput,
  ): Promise<SocialNetwork> => {
    const { data } = await authClient.put<SocialNetwork>(
      `${API_URL}/${id}`,
      input,
    );
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};

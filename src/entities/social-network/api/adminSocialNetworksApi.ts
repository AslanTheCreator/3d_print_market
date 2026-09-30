import { authClient } from "@/shared/api";
import type { SocialNetwork, SocialNetworkInput } from "../model/types";
const path = (agent: number) => `/admin/actions/agents/${agent}/social-networks`;
export const adminSocialNetworksApi = {
  async list(agent: number, signal?: AbortSignal): Promise<SocialNetwork[]> {
    return (await authClient.get<SocialNetwork[]>(path(agent), { signal })).data;
  },
  async create(agent: number, input: SocialNetworkInput) { await authClient.post(path(agent), input); },
  async update(agent: number, id: number, input: SocialNetworkInput) { await authClient.put(`${path(agent)}/${id}`, input); },
  async remove(agent: number, id: number) { await authClient.delete(`${path(agent)}/${id}`); },
};

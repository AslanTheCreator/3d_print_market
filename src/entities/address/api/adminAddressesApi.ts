import { authClient } from "@/shared/api";
import type { Address, AddressInput } from "../model/types";
const path = (agent: number) => `/admin/actions/agents/${agent}/addresses`;
export const adminAddressesApi = {
  async list(agent: number, signal?: AbortSignal): Promise<Address[]> {
    return (await authClient.get<Address[]>(path(agent), { signal })).data;
  },
  async create(agent: number, input: AddressInput) {
    await authClient.post(path(agent), input);
  },
  async update(agent: number, id: number, input: AddressInput) {
    await authClient.put(`${path(agent)}/${id}`, input);
  },
  async remove(agent: number, id: number) {
    await authClient.delete(`${path(agent)}/${id}`);
  },
};

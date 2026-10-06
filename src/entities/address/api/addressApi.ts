import { authClient } from "@/shared/api";
import type { AddressInput } from "../model/types";
import { Address } from "../model/types";

const API_URL = "/address";

export const addressApi = {
  getAll: async (signal?: AbortSignal): Promise<Address[]> => {
    const { data } = await authClient.get<Address[]>(API_URL, { signal });
    return data;
  },

  create: async (input: AddressInput): Promise<void> => {
    await authClient.post(API_URL, input);
  },

  update: async (id: number, input: AddressInput): Promise<Address> => {
    const { data } = await authClient.put<Address>(`${API_URL}/${id}`, input);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};

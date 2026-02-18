import { authClient } from "@/shared/api";
import type { TransferInput } from "../model/types";
import { Transfer } from "@/shared/types";

const API_URL = "/transfer";

export const transferApi = {
  getAll: async (): Promise<Transfer[]> => {
    const { data } = await authClient.get<Transfer[]>(API_URL);
    return data;
  },

  create: async (input: TransferInput): Promise<void> => {
    await authClient.post(API_URL, input);
  },

  update: async (id: number, input: TransferInput): Promise<Transfer> => {
    const { data } = await authClient.put<Transfer>(`${API_URL}/${id}`, input);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};

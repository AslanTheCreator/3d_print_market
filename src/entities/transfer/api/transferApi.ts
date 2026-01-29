import { authClient } from "@/shared/api";
import type { Transfer, TransferInput } from "../model/types";
import { ApiError } from "@/shared/lib/errorHandler";

const API_URL = "/transfer";

export const transferApi = {
  getAll: async (): Promise<Transfer[]> => {
    try {
      const { data } = await authClient.get<Transfer[]>(API_URL);
      return data;
    } catch (error: any) {
      if (error?.response?.data?.code === "TRANSFER_NOT_FOUND") {
        return [];
      }
      throw error;
    }
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

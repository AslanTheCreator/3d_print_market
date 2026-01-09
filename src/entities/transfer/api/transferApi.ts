import { TransferBaseModel, TransferCreateModel } from "../model/types";
import { authClient } from "@/shared/api";

const API_URL = `/transfer`;

export const transferApi = {
  createTransfer: async (data: TransferCreateModel): Promise<void> => {
    await authClient.post(API_URL, data);
  },

  getUserTransfers: async (): Promise<TransferBaseModel[]> => {
    const { data } = await authClient.get<TransferBaseModel[]>(API_URL);
    return data;
  },

  deleteTransfer: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};

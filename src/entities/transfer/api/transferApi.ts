import { TransferBaseModel, TransferCreateModel } from "../model/types";
import { authApi } from "@/shared/api";

const API_URL = `/transfer`;

export const transferApi = {
  createTransfer: async (data: TransferCreateModel): Promise<void> => {
    await authApi.post(API_URL, data);
  },

  getUserTransfers: async (): Promise<TransferBaseModel[]> => {
    const { data } = await authApi.get<TransferBaseModel[]>(API_URL);
    return data;
  },

  deleteTransfer: async (id: number): Promise<void> => {
    await authApi.delete(`${API_URL}/${id}`);
  },
};

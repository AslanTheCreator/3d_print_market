import { TransferBaseModel, TransferCreateModel } from "../model/types";
import { errorHandler } from "@/shared/lib";
import { authApi } from "@/shared/api";

const API_URL = `/transfer`;

export const transferApi = {
  createTransfer: async (data: TransferCreateModel) => {
    try {
      await authApi.post(API_URL, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при создании способа отправки"
      );
    }
  },

  getUserTransfers: async (): Promise<TransferBaseModel[]> => {
    try {
      const { data } = await authApi.get<TransferBaseModel[]>(API_URL);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при получении способов отправки"
      );
    }
  },

  deleteTransfer: async (id: number) => {
    try {
      await authApi.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при удалении способа отправки"
      );
    }
  },
};

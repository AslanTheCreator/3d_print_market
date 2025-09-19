import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { TransferBaseModel, TransferCreateModel } from "../model/types";
import { errorHandler } from "@/shared/lib/error-handler";

import "@/shared/config/axiosInterceptor";

const API_URL = `/transfer`;
const authenticatedAxios = createAuthenticatedAxiosInstance();

export const transferApi = {
  createTransfer: async (data: TransferCreateModel) => {
    try {
      await authenticatedAxios.post(API_URL, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при создании способа отправки"
      );
    }
  },

  getUserTransfers: async (): Promise<TransferBaseModel[]> => {
    try {
      const { data } = await authenticatedAxios.get<TransferBaseModel[]>(
        API_URL
      );
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
      await authenticatedAxios.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при удалении способа отправки"
      );
    }
  },
};

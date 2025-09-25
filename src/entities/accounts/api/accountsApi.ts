import { errorHandler } from "@/shared/lib";
import { AccountsBaseModel, AccountsCreateModel } from "../model/types";
import { authApi } from "@/shared/api";

const API_URL = `/accounts`;

export const accountsApi = {
  getUserAccounts: async (): Promise<AccountsBaseModel[]> => {
    try {
      const { data } = await authApi.get<AccountsBaseModel[]>(API_URL);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при получении аккаунтов пользователя"
      );
    }
  },

  createAccount: async (data: AccountsCreateModel) => {
    try {
      await authApi.post(API_URL, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при создании аккаунта"
      );
    }
  },

  deleteAccount: async (id: number) => {
    try {
      await authApi.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при удалении аккаунта"
      );
    }
  },
};

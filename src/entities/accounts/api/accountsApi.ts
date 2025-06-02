import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import config from "@/shared/config/api";
import { errorHandler } from "@/shared/lib/errorHandler";
import { AccountsBaseModel, AccountsCreateModel } from "../model/types";

const API_URL = `${config.apiBaseUrl}/accounts`;
const authenticatedAxios = createAuthenticatedAxiosInstance();

export const accountsApi = {
  getUserAccounts: async (): Promise<AccountsBaseModel[]> => {
    try {
      const { data } = await authenticatedAxios.get<AccountsBaseModel[]>(
        API_URL
      );
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
      await authenticatedAxios.post(API_URL, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при создании аккаунта"
      );
    }
  },

  deleteAccount: async (id: number) => {
    try {
      await authenticatedAxios.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при удалении аккаунта"
      );
    }
  },
};

import { AccountsBaseModel, AccountsCreateModel } from "../model/types";
import { authApi } from "@/shared/api";

const API_URL = `/accounts`;

export const accountsApi = {
  getUserAccounts: async (): Promise<AccountsBaseModel[]> => {
    const { data } = await authApi.get<AccountsBaseModel[]>(API_URL);
    return data;
  },

  createAccount: async (data: AccountsCreateModel): Promise<void> => {
    await authApi.post(API_URL, data);
  },

  deleteAccount: async (id: number): Promise<void> => {
    await authApi.delete(`${API_URL}/${id}`);
  },
};

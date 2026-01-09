import { AccountsBaseModel, AccountsCreateModel } from "../model/types";
import { authClient } from "@/shared/api";

const API_URL = `/accounts`;

export const accountsApi = {
  getUserAccounts: async (): Promise<AccountsBaseModel[]> => {
    const { data } = await authClient.get<AccountsBaseModel[]>(API_URL);
    return data;
  },

  createAccount: async (data: AccountsCreateModel): Promise<void> => {
    await authClient.post(API_URL, data);
  },

  deleteAccount: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};

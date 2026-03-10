import { AccountsBaseModel } from "@/shared/types";
import { AccountsCreateModel } from "../model/types";
import { authClient } from "@/shared/api";

const API_URL = `/accounts`;

export const accountsApi = {
  getAll: async (): Promise<AccountsBaseModel[]> => {
    const { data } = await authClient.get<AccountsBaseModel[]>(API_URL);
    return data;
  },

  getUser: async (id: number): Promise<AccountsBaseModel[]> => {
    const { data } = await authClient.get<AccountsBaseModel[]>(
      `${API_URL}/participant/${id}`,
    );
    return data;
  },

  create: async (data: AccountsCreateModel): Promise<void> => {
    await authClient.post(API_URL, data);
  },

  delete: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};

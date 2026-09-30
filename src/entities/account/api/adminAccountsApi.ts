import { authClient } from "@/shared/api";
import { ApiError } from "@/shared/lib/errorHandler";
import type { AccountsBaseModel, AccountsCreateModel } from "../model/types";
const path = (agent: number) => `/admin/actions/agents/${agent}/accounts`;
export const adminAccountsApi = {
  async list(
    agent: number,
    signal?: AbortSignal,
  ): Promise<AccountsBaseModel[]> {
    try {
      return (
        await authClient.get<AccountsBaseModel[]>(path(agent), { signal })
      ).data;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.statusCode === 404 &&
        error.code === "ACCOUNT_NOT_FOUND"
      )
        return [];
      throw error;
    }
  },
  async create(agent: number, input: AccountsCreateModel) {
    await authClient.post(path(agent), input);
  },
  async update(agent: number, id: number, input: AccountsCreateModel) {
    await authClient.put(`${path(agent)}/${id}`, input);
  },
  async remove(agent: number, id: number) {
    await authClient.delete(`${path(agent)}/${id}`);
  },
};

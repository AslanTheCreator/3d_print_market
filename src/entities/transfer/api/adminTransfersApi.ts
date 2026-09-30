import { authClient } from "@/shared/api";
import type { Transfer, TransferInput } from "../model/types";
const path = (agent: number) => `/admin/actions/agents/${agent}/transfers`;
export const adminTransfersApi = {
  async list(agent: number, signal?: AbortSignal): Promise<Transfer[]> {
    return (await authClient.get<Transfer[]>(path(agent), { signal })).data;
  },
  async create(agent: number, input: TransferInput) { await authClient.post(path(agent), input); },
  async update(agent: number, id: number, input: TransferInput) { await authClient.put(`${path(agent)}/${id}`, input); },
  async remove(agent: number, id: number) { await authClient.delete(`${path(agent)}/${id}`); },
};

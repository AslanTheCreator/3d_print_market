import { authClient } from "@/shared/api";
import type { AgentProfile, AgentProfileInput, AgentSummary } from "../model/types";

export const agentApi = {
  async list(signal?: AbortSignal) {
    return (await authClient.get<AgentSummary[]>("/admin/actions/agents", { signal })).data;
  },
  async profile(id: number, signal?: AbortSignal) {
    return (await authClient.get<AgentProfile>(`/admin/actions/agents/${id}/profile`, { signal })).data;
  },
  async updateProfile(id: number, input: AgentProfileInput) {
    return (await authClient.put<AgentProfile>(`/admin/actions/agents/${id}/profile`, input)).data;
  },
};

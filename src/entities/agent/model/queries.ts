import { useQuery } from "@tanstack/react-query";
import { agentApi } from "../api/agentApi";

export const agentKeys = {
  list: (session: number | null) => ["admin", session, "agents"] as const,
  profile: (session: number | null, id: number) =>
    ["admin", session, "agent", id, "profile"] as const,
};
export const useAgents = (session: number | null) =>
  useQuery({
    queryKey: agentKeys.list(session),
    queryFn: ({ signal }) => agentApi.list(signal),
    enabled: session !== null,
    retry: false,
  });
export const useAgentProfile = (session: number | null, id: number) =>
  useQuery({
    queryKey: agentKeys.profile(session, id),
    queryFn: ({ signal }) => agentApi.profile(id, signal),
    enabled: session !== null && Number.isSafeInteger(id) && id > 0,
    retry: false,
  });

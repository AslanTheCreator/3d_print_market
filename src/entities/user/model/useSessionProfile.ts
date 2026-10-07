import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/shared/api";
import type { UserProfileModel } from "./types";
export const useSessionProfile = (session: number | null) => useQuery({
  queryKey: ["admin", session, "access"],
  queryFn: async ({ signal }) => (await authClient.get<UserProfileModel>("/auth/profile", { signal })).data,
  enabled: session !== null, staleTime: 0, retry: false,
});

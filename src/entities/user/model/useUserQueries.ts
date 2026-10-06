import { usePrivateScope } from "@/shared/lib/query";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { userKeys } from "./queryKeys";
import { UserFindModel } from "../model/types";

export const useCurrentUser = () => {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(userKeys.current()),
    queryFn: ({ signal }) => userApi.getUser(signal),
    staleTime: 1000 * 60 * 10, // 10 минут
    gcTime: 1000 * 60 * 30,
    enabled: scope.id !== null,
  });
};

interface UseProfileUserOptions {
  enabled?: boolean;
}

export const useProfileUser = (options?: UseProfileUserOptions) => {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(userKeys.profile()),
    queryFn: ({ signal }) => userApi.getProfileUser(signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: scope.id !== null && (options?.enabled ?? true),
  });
};

export const useUserById = (id?: number) => {
  return useQuery<UserFindModel | null>({
    queryKey: userKeys.byId(id ?? 0),
    queryFn: async () => {
      if (!id) return null;
      const users = await userApi.getUserByParams(id);
      return users[0] ?? null;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
};

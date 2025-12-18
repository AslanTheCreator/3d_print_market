import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "../api/accountsApi";
import { accountsKeys } from "./queryKeys";

export const useUserAccounts = () => {
  return useQuery({
    queryKey: accountsKeys.userList(),
    queryFn: accountsApi.getUserAccounts,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "../api/accountsApi"; // Adjusted path
import { AccountsBaseModel } from "../model/types";
import { accountsKeys } from "./queryKeys"; // Adjusted path

export const useUserAccounts = () => {
  return useQuery<AccountsBaseModel[]>({
    queryKey: accountsKeys.all,
    queryFn: accountsApi.getUserAccounts,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};

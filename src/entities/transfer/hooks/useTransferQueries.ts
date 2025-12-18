import { useQuery } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi";
import { transferKeys } from "./queryKeys";

export const useUserTransfers = () => {
  return useQuery({
    queryKey: transferKeys.userList(),
    queryFn: transferApi.getUserTransfers,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

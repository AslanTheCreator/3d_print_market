import { usePrivateScope } from "@/shared/lib/query";
import { useQuery } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi";
import { transferKeys } from "./queryKeys";

export const useTransfers = () => {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(transferKeys.list()),
    queryFn: ({ signal }) => transferApi.getAll(signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    enabled: scope.id !== null,
  });
};


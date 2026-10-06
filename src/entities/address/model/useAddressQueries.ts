import { usePrivateScope } from "@/shared/lib/query";
import { useQuery } from "@tanstack/react-query";
import { addressApi } from "../api/addressApi";
import { addressKeys } from "./queryKeys";

export const useAddresses = () => {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(addressKeys.lists()),
    queryFn: ({ signal }) => addressApi.getAll(signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: scope.id !== null,
  });
};

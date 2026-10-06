import { usePrivateScope } from "@/shared/lib/query";
import { useQuery } from "@tanstack/react-query";
import { socialNetworksApi } from "../api/socialNetworksApi";
import { socialNetworksKeys } from "./queryKeys";

export const useSocialNetworks = () => {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(socialNetworksKeys.lists()),
    queryFn: ({ signal }) => socialNetworksApi.getAll(signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: scope.id !== null,
  });
};

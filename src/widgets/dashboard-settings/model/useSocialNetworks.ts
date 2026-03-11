import { useQuery } from "@tanstack/react-query";
import { socialNetworksApi } from "../api/socialNetworksApi";
import { socialNetworksKeys } from "./queryKeys";

export const useSocialNetworks = () => {
  return useQuery({
    queryKey: socialNetworksKeys.lists(),
    queryFn: socialNetworksApi.getAll,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

import { useQuery } from "@tanstack/react-query";
import { socialNetworksApi } from "../api/socialNetworksApi";
import { socialNetworksKeys } from "./queryKeys";

export const useUserSocialNetworks = () => {
  return useQuery({
    queryKey: socialNetworksKeys.userList(),
    queryFn: socialNetworksApi.getSocialNetworks,
    staleTime: 1000 * 60 * 5, // 5 минут — соцсети редко меняются
    gcTime: 1000 * 60 * 10,
  });
};

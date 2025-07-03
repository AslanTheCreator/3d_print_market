import { useQuery } from "@tanstack/react-query";
import { addressApi } from "../api/addressApi";
import { addressKeys } from "./queryKeys";

export const useUserAddresses = () => {
  return useQuery({
    queryKey: addressKeys.lists(),
    queryFn: addressApi.getUserAddresses,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
};

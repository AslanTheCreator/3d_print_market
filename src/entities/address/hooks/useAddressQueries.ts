import { useQuery } from "@tanstack/react-query";
import { addressApi } from "../api/addressApi";
import { addressKeys } from "./queryKeys";

export const useAddresses = () => {
  return useQuery({
    queryKey: addressKeys.lists(),
    queryFn: addressApi.getAll,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

import { useQuery } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi";
import { transferKeys } from "./queryKeys";

export const useTransfers = () => {
  return useQuery({
    queryKey: transferKeys.list(),
    queryFn: transferApi.getAll,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

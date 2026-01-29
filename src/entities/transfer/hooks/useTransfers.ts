import { useQuery } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi";
import { transferKeys } from "./queryKeys";

export const useTransfers = () => {
  return useQuery({
    queryKey: transferKeys.list(),
    queryFn: transferApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
    refetchOnWindowFocus: false, // НЕ перезагружать при фокусе окна/таба
    refetchOnReconnect: false, // НЕ перезагружать при reconnect
    retry: 1,
  });
};

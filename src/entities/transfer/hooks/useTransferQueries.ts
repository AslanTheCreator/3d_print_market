import { useQuery } from "@tanstack/react-query";
import { transferApi } from "../api/transferApi"; // Исправленный путь к transferApi
import { transferKeys } from "./queryKeys"; // Импорт ключей

export const useUserTransfers = () => {
  return useQuery({
    queryKey: transferKeys.userTransfers(),
    queryFn: transferApi.getUserTransfers,
    staleTime: 10 * 60 * 1000, // 10 минут
    gcTime: 15 * 60 * 1000, // 15 минут
    retry: 2,
  });
};

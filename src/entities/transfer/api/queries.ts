import { useQuery } from "@tanstack/react-query";
import { transferApi } from "./transferApi";

// Query keys
export const transferKeys = {
  all: ["transfers"] as const,
  lists: () => [...transferKeys.all, "list"] as const,
  userTransfers: () => [...transferKeys.lists(), "user"] as const,
};

// Queries
export const useUserTransfers = () => {
  return useQuery({
    queryKey: transferKeys.userTransfers(),
    queryFn: transferApi.getUserTransfers,
    staleTime: 10 * 60 * 1000, // 10 минут
    gcTime: 15 * 60 * 1000, // 15 минут
    retry: 2,
  });
};

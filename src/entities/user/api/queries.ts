import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi"; // путь подставь свой

export const useUserByParams = (id?: number) => {
  return useQuery({
    queryKey: ["userByParams", id],
    queryFn: () => userApi.getUserByParams(id),
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 1,
  });
};

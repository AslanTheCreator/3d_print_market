import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { UserBaseModel } from "../model/types";

export const useUser = () => {
  return useQuery<UserBaseModel, Error>({
    queryKey: ["user"],
    queryFn: () => userApi.getUser(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

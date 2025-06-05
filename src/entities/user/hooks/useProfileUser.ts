import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { UserProfileModel } from "../model/types";

export const useProfileUser = () => {
  return useQuery<UserProfileModel, Error>({
    queryKey: ["user"],
    queryFn: () => userApi.getProfileUser(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

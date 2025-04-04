import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { UserProfileModel } from "../model/types";
import { UseCartProductsOptions } from "@/entities/cart/hooks/useCartProducts";

export const useProfileUser = ({
  staleTime = 1000 * 60 * 5,
  retry = 1,
}: UseCartProductsOptions) => {
  return useQuery<UserProfileModel, Error>({
    queryKey: ["user"],
    queryFn: () => userApi.getProfileUser(),
    staleTime,
    retry,
  });
};

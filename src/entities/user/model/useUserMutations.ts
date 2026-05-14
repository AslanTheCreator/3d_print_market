import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { userKeys } from "./queryKeys";
import type {
  UserBaseModel,
  UserProfileModel,
  UserUpdateModel,
} from "../model/types";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserUpdateModel) => userApi.updateUser(data),

    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: userKeys.current() });
      await queryClient.cancelQueries({ queryKey: userKeys.profile() });

      const previousCurrent = queryClient.getQueryData<UserBaseModel>(
        userKeys.current(),
      );
      const previousProfile = queryClient.getQueryData<UserProfileModel>(
        userKeys.profile(),
      );

      if (previousCurrent) {
        queryClient.setQueryData<UserBaseModel>(userKeys.current(), {
          ...previousCurrent,
          ...newData,
          imageId: newData.imageId ?? previousCurrent.imageId,
        });
      }

      if (previousProfile) {
        queryClient.setQueryData<UserProfileModel>(userKeys.profile(), {
          ...previousProfile,
          login: newData.login,
          fullName: newData.fullName,
          imageId: newData.imageId ?? previousProfile.imageId,
        });
      }

      return { previousCurrent, previousProfile };
    },

    onError: (_error, _vars, context) => {
      if (context?.previousCurrent) {
        queryClient.setQueryData(userKeys.current(), context.previousCurrent);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(userKeys.profile(), context.previousProfile);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.current() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
};

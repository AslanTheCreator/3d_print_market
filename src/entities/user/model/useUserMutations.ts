import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { userKeys } from "./queryKeys";
import type {
  UserBaseModel,
  UserProfileModel,
  UserUpdateModel,
} from "../model/types";

interface UpdateUserMutationVariables {
  userData: UserUpdateModel;
}

export const useUpdateUser = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: async ({
      userData,
    }: UpdateUserMutationVariables): Promise<number> => {
      return userApi.updateUser(userData);
    },

    onMutate: async ({ userData }) => {
      await queryClient.cancelQueries({ queryKey: scope.key(userKeys.current()) });
      if (!scope.isCurrent()) throw new Error("Session ended");
      await queryClient.cancelQueries({ queryKey: scope.key(userKeys.profile()) });
      if (!scope.isCurrent()) throw new Error("Session ended");

      const previousCurrent = queryClient.getQueryData<UserBaseModel>(
        scope.key(userKeys.current()),
      );
      const previousProfile = queryClient.getQueryData<UserProfileModel>(
        scope.key(userKeys.profile()),
      );

      if (previousCurrent) {
        queryClient.setQueryData<UserBaseModel>(scope.key(userKeys.current()), {
          ...previousCurrent,
          ...userData,
          imageId: userData.imageId ?? previousCurrent.imageId,
        });
      }

      if (previousProfile) {
        queryClient.setQueryData<UserProfileModel>(scope.key(userKeys.profile()), {
          ...previousProfile,
          login: userData.login,
          fullName: userData.fullName,
          imageId: userData.imageId ?? previousProfile.imageId,
        });
      }

      return { previousCurrent, previousProfile };
    },

    onError: (_error, _vars, context) => {
      if (context?.previousCurrent) {
        queryClient.setQueryData(scope.key(userKeys.current()), context.previousCurrent);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(scope.key(userKeys.profile()), context.previousProfile);
      }
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scope.key(userKeys.current()) }),
        queryClient.invalidateQueries({ queryKey: scope.key(userKeys.profile()) }),
      ]);
    },
  });
};

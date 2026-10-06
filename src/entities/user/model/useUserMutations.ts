import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { imageApi } from "@/entities/image/@x/user";
import { userApi } from "../api/userApi";
import { userKeys } from "./queryKeys";
import type {
  UserBaseModel,
  UserProfileModel,
  UserUpdateModel,
} from "../model/types";

interface UpdateUserMutationVariables {
  userData: UserUpdateModel;
  imageIdToDelete?: number;
}

export const useUpdateUser = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: async ({
      userData,
      imageIdToDelete,
    }: UpdateUserMutationVariables): Promise<number> => {
      const userId = await userApi.updateUser(userData);
      if (!scope.isCurrent()) throw new Error("Session ended");

      if (imageIdToDelete !== undefined) {
        await imageApi.deleteImages([imageIdToDelete], "PARTICIPANT");
      }

      return userId;
    },

    onMutate: async ({ userData, imageIdToDelete }) => {
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
          imageId:
            imageIdToDelete !== undefined
              ? null
              : (userData.imageId ?? previousCurrent.imageId),
          image: imageIdToDelete !== undefined ? [] : previousCurrent.image,
        });
      }

      if (previousProfile) {
        queryClient.setQueryData<UserProfileModel>(scope.key(userKeys.profile()), {
          ...previousProfile,
          login: userData.login,
          fullName: userData.fullName,
          imageId:
            imageIdToDelete !== undefined
              ? null
              : (userData.imageId ?? previousProfile.imageId),
          image: imageIdToDelete !== undefined ? [] : previousProfile.image,
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

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userData,
      imageIdToDelete,
    }: UpdateUserMutationVariables): Promise<number> => {
      const userId = await userApi.updateUser(userData);

      if (imageIdToDelete !== undefined) {
        await imageApi.deleteImages([imageIdToDelete], "PARTICIPANT");
      }

      return userId;
    },

    onMutate: async ({ userData, imageIdToDelete }) => {
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
          ...userData,
          imageId:
            imageIdToDelete !== undefined
              ? null
              : (userData.imageId ?? previousCurrent.imageId),
          image: imageIdToDelete !== undefined ? [] : previousCurrent.image,
        });
      }

      if (previousProfile) {
        queryClient.setQueryData<UserProfileModel>(userKeys.profile(), {
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
        queryClient.setQueryData(userKeys.current(), context.previousCurrent);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(userKeys.profile(), context.previousProfile);
      }
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.current() }),
        queryClient.invalidateQueries({ queryKey: userKeys.profile() }),
      ]);
    },
  });
};

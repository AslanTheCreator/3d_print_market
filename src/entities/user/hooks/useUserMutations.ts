import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { userKeys } from "./queryKeys";
import { useNotification } from "@/app/providers/NotificationProvider";
import type { UserBaseModel, UserUpdateModel } from "../model/types";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (data: UserUpdateModel) => userApi.updateUser(data),

    onMutate: async (newData) => {
      // Отменяем текущие запросы
      await queryClient.cancelQueries({ queryKey: userKeys.current() });
      await queryClient.cancelQueries({ queryKey: userKeys.profile() });

      const previousCurrent = queryClient.getQueryData<UserBaseModel>(
        userKeys.current()
      );
      const previousProfile = queryClient.getQueryData<any>(userKeys.profile());

      // Оптимистическое обновление
      if (previousCurrent) {
        queryClient.setQueryData<UserBaseModel>(userKeys.current(), {
          ...previousCurrent,
          ...newData,
          imageId: newData.imageId ?? previousCurrent.imageId,
        });
      }

      if (previousProfile) {
        queryClient.setQueryData(userKeys.profile(), {
          ...previousProfile,
          user: {
            ...previousProfile.user,
            ...newData,
          },
        });
      }

      return { previousCurrent, previousProfile };
    },

    onError: (error, _vars, context) => {
      // Откат
      if (context?.previousCurrent) {
        queryClient.setQueryData(userKeys.current(), context.previousCurrent);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(userKeys.profile(), context.previousProfile);
      }

      const msg =
        error instanceof Error
          ? error.message
          : "Ошибка при обновлении профиля";
      showNotification(msg, "error");
    },

    onSuccess: () => {
      showNotification("Профиль успешно обновлён", "success");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.current() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
};

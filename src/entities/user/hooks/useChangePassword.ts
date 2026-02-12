import { useMutation } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { useNotification } from "@/app/providers/NotificationProvider";
import { ApiError } from "@/shared/lib/errorHandler";
import type { ChangePasswordParams } from "../model/types";

export const useChangePassword = () => {
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: ChangePasswordParams) =>
      userApi.changePassword(oldPassword, newPassword),

    onSuccess: () => {
      showNotification("Пароль успешно изменён", "success");
    },

    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.isStatus(400)) {
          showNotification("Неверный текущий пароль", "error");
          return;
        }

        showNotification(error.message, "error");
        return;
      }

      const msg =
        error instanceof Error ? error.message : "Не удалось изменить пароль";
      showNotification(msg, "error");
    },
  });
};

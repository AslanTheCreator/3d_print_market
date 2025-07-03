import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { userKeys } from "./queryKeys";
import { UserUpdateModel } from "../model/types";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userData: UserUpdateModel) => userApi.updateUser(userData),
    onSuccess: () => {
      // Инвалидируем запросы, связанные с пользователем, чтобы обновить данные
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail("current") });
      // Можно добавить инвалидацию других ключей, если это необходимо
    },
    onError: (error) => {
      console.error("Error updating user:", error);
      // Здесь можно добавить обработку ошибок, например, показ уведомления
    },
  });
};

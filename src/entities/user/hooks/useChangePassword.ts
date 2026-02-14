import { useMutation } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import type { ChangePasswordParams } from "../model/types";

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: ChangePasswordParams) =>
      userApi.changePassword(oldPassword, newPassword),
  });
};

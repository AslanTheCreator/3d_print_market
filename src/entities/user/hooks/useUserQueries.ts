import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/userApi";
import { userKeys } from "./queryKeys";
import { UserBaseModel, UserProfileModel, UserFindModel } from "../model/types";

/**
 * Fetches base information about the currently authenticated user.
 */
export const useUser = () => {
  return useQuery<UserBaseModel, Error>({
    // Используем userKeys.details() с уникальным идентификатором для текущего пользователя,
    // чтобы избежать конфликтов и ясно обозначить, что это данные конкретного пользователя.
    // "current" или "session" может быть хорошим выбором.
    queryKey: userKeys.detail("current"), // Был ["user"]
    queryFn: () => userApi.getUser(),
    staleTime: 1000 * 60 * 5, // 5 минут
    retry: 1,
  });
};

/**
 * Fetches the profile information for the currently authenticated user.
 */
export const useProfileUser = () => {
  return useQuery<UserProfileModel, Error>({
    queryKey: userKeys.profile(), // Был ["user"]
    queryFn: () => userApi.getProfileUser(),
    staleTime: 1000 * 60 * 5, // 5 минут
    retry: 1,
  });
};

/**
 * Fetches user information by specific parameters (e.g., ID).
 */
export const useUserByParams = (id?: number) => {
  return useQuery<UserFindModel[], Error>({ // userApi.getUserByParams возвращает UserFindModel[]
    queryKey: userKeys.detail(id), // Был ["userByParams", id]
    queryFn: () => userApi.getUserByParams(id),
    enabled: typeof id === 'number', // Запрос выполнится только если id является числом
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 1,
  });
};

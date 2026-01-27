import { useMutation, useQueryClient } from "@tanstack/react-query";
import { socialNetworksApi } from "../api/socialNetworksApi";
import { socialNetworksKeys } from "./queryKeys";
import type { SocialNetwork, SocialNetworkInput } from "../model/types";

// Создание соцсети
export const useCreateSocial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SocialNetworkInput) => socialNetworksApi.create(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialNetworksKeys.list() });
    },
  });
};

// Обновление соцсети
export const useUpdateSocial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SocialNetworkInput }) =>
      socialNetworksApi.update(id, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialNetworksKeys.list() });
    },
  });
};

// Удаление соцсети
export const useDeleteSocial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => socialNetworksApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: socialNetworksKeys.list() });
      const previous = queryClient.getQueryData<SocialNetwork[]>(
        socialNetworksKeys.list(),
      );

      // Оптимистично удаляем из кэша
      queryClient.setQueryData<SocialNetwork[]>(
        socialNetworksKeys.list(),
        (old = []) => old.filter((s) => s.id !== id),
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(socialNetworksKeys.list(), context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialNetworksKeys.list() });
    },
  });
};

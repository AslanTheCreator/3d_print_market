import { useMutation, useQueryClient } from "@tanstack/react-query";
import { socialNetworksApi } from "../api/socialNetworksApi";
import { socialNetworksKeys } from "./queryKeys";
import { useNotification } from "@/app/providers";
import type {
  SocialNetworksCreateModel,
  SocialNetworksModel,
} from "../model/types";

export const useCreateSocialNetwork = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: socialNetworksApi.createSocialNetwork,

    onMutate: async (newSocial) => {
      await queryClient.cancelQueries({
        queryKey: socialNetworksKeys.userList(),
      });

      const previous = queryClient.getQueryData<SocialNetworksModel[]>(
        socialNetworksKeys.userList()
      );

      // Оптимистическое добавление
      queryClient.setQueryData<SocialNetworksModel[]>(
        socialNetworksKeys.userList(),
        (old = []) => [
          ...old,
          {
            ...newSocial,
            id: Date.now(),
            participantId: 0,
          } as SocialNetworksModel,
        ]
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      queryClient.setQueryData(
        socialNetworksKeys.userList(),
        context?.previous
      );
      showNotification(
        error instanceof Error ? error.message : "Не удалось добавить соцсеть",
        "error"
      );
    },

    onSuccess: () => {
      showNotification("Соцсеть добавлена", "success");
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: socialNetworksKeys.userList(),
      });
    },
  });
};

export const useDeleteSocialNetwork = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: socialNetworksApi.deleteSocialNetwork,

    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: socialNetworksKeys.userList(),
      });

      const previous = queryClient.getQueryData<SocialNetworksModel[]>(
        socialNetworksKeys.userList()
      );

      queryClient.setQueryData<SocialNetworksModel[]>(
        socialNetworksKeys.userList(),
        (old = []) => old.filter((s) => s.id !== id)
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      queryClient.setQueryData(
        socialNetworksKeys.userList(),
        context?.previous
      );
      showNotification("Не удалось удалить соцсеть", "error");
    },

    onSuccess: () => {
      showNotification("Соцсеть удалена", "success");
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: socialNetworksKeys.userList(),
      });
    },
  });
};

export const useSaveSocialNetworksBatch = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: async ({
      toCreate,
      toDelete,
    }: {
      toCreate: SocialNetworksCreateModel[];
      toDelete: number[];
    }) => {
      await Promise.all([
        ...toCreate.map((s) => socialNetworksApi.createSocialNetwork(s)),
        ...toDelete.map((id) => socialNetworksApi.deleteSocialNetwork(id)),
      ]);
    },

    onSuccess: () => {
      showNotification("Соцсети сохранены", "success");
    },

    onError: () => {
      showNotification("Ошибка при сохранении", "error");
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: socialNetworksKeys.userList(),
      });
    },
  });
};

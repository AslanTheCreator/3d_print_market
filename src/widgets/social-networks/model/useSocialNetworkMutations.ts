import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SocialNetwork } from "@/shared/types";
import { socialNetworksApi } from "../api/socialNetworksApi";
import { socialNetworksKeys } from "./queryKeys";
import type { SocialNetworkInput } from "./types";

export const useCreateSocial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SocialNetworkInput) => socialNetworksApi.create(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialNetworksKeys.lists() });
    },
  });
};

export const useUpdateSocial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SocialNetworkInput }) =>
      socialNetworksApi.update(id, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialNetworksKeys.lists() });
    },
  });
};

export const useDeleteSocial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => socialNetworksApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: socialNetworksKeys.lists(),
      });

      const previous = queryClient.getQueryData<SocialNetwork[]>(
        socialNetworksKeys.lists(),
      );

      queryClient.setQueryData<SocialNetwork[]>(
        socialNetworksKeys.lists(),
        (old = []) => old.filter((item) => item.id !== id),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(socialNetworksKeys.lists(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialNetworksKeys.lists() });
    },
  });
};

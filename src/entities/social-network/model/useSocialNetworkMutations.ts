import { usePrivateScope, usePrivateMutation } from "@/shared/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import type { SocialNetwork } from "./types";
import { socialNetworksApi } from "../api/socialNetworksApi";
import { socialNetworksKeys } from "./queryKeys";
import type { SocialNetworkInput } from "./types";

export const useCreateSocial = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: (input: SocialNetworkInput) => socialNetworksApi.create(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(socialNetworksKeys.lists()) });
    },
  });
};

export const useUpdateSocial = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: ({ id, input }: { id: number; input: SocialNetworkInput }) =>
      socialNetworksApi.update(id, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(socialNetworksKeys.lists()) });
    },
  });
};

export const useDeleteSocial = () => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return usePrivateMutation({
    mutationFn: (id: number) => socialNetworksApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: scope.key(socialNetworksKeys.lists()),
      });
      if (!scope.isCurrent()) throw new Error("Session ended");

      const previous = queryClient.getQueryData<SocialNetwork[]>(
        scope.key(socialNetworksKeys.lists()),
      );

      queryClient.setQueryData<SocialNetwork[]>(
        scope.key(socialNetworksKeys.lists()),
        (old = []) => old.filter((item) => item.id !== id),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(scope.key(socialNetworksKeys.lists()), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scope.key(socialNetworksKeys.lists()) });
    },
  });
};

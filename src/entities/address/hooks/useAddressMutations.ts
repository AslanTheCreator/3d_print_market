import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addressApi } from "../api/addressApi";
import { addressKeys } from "./queryKeys";
import type { Address, AddressInput } from "../model/types";

// Создание адреса
export const useCreateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddressInput) => addressApi.create(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.list() });
    },
  });
};

// Обновление адреса
export const useUpdateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AddressInput }) =>
      addressApi.update(id, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.list() });
    },
  });
};

// Удаление адреса
export const useDeleteAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => addressApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: addressKeys.list() });
      const previous = queryClient.getQueryData<Address[]>(addressKeys.list());

      // Оптимистично удаляем из кэша
      queryClient.setQueryData<Address[]>(addressKeys.list(), (old = []) =>
        old.filter((a) => a.id !== id),
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(addressKeys.list(), context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.list() });
    },
  });
};

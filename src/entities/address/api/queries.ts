import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addressApi } from "./addressApi";
import { AddressBaseModel } from "../model/types";
import { addressKeys } from "./queryKeys";

// Queries
export const useUserAddresses = () => {
  return useQuery({
    queryKey: addressKeys.lists(),
    queryFn: addressApi.getUserAddresses,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
};

// Mutations
export const useCreateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addressApi.createAddress,
    onSuccess: () => {
      // Инвалидируем кэш адресов
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
    onError: (error) => {
      console.error("Ошибка создания адреса:", error);
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addressApi.deleteAddress,
    onMutate: async (addressId: number) => {
      // Отменяем исходящие запросы
      await queryClient.cancelQueries({ queryKey: addressKeys.lists() });

      // Получаем текущие данные
      const previousAddresses = queryClient.getQueryData<AddressBaseModel[]>(
        addressKeys.lists()
      );

      // Оптимистично обновляем данные
      if (previousAddresses) {
        queryClient.setQueryData<AddressBaseModel[]>(
          addressKeys.lists(),
          previousAddresses.filter((address) => address.id !== addressId)
        );
      }

      return { previousAddresses };
    },
    onError: (err, addressId, context) => {
      // Откатываем изменения при ошибке
      if (context?.previousAddresses) {
        queryClient.setQueryData(
          addressKeys.lists(),
          context.previousAddresses
        );
      }
    },
    onSettled: () => {
      // Обновляем данные в любом случае
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
  });
};

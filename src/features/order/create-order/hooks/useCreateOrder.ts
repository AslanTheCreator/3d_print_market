import { orderApi } from "@/entities/order/api/orderApi";
import { OrderCreateModel } from "@/entities/order/model/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrderCreateModel) => orderApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      console.error("Ошибка при создании заказа:", error);
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";
import { useNotification } from "@/app/providers";

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

export const useExtendProductExpiration = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (productId: number) =>
      productApi.extendProductExpiration(productId),
    onSuccess: () => {
      // Инвалидируем список пользовательских товаров
      queryClient.invalidateQueries({ queryKey: ["userProducts"] });
      showNotification("Срок действия товара продлён на 30 дней", "success");
    },
    onError: (error) => {
      console.error("Ошибка при продлении товара:", error);
      showNotification("Не удалось продлить товар. Попробуйте позже", "error");
    },
  });
};

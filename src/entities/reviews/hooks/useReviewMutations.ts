import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewsApi } from "../api/reviewsApi";
import { reviewsQueryKeys } from "./queryKeys";
import { productKeys } from "@/entities/product/hooks/queryKeys";
import { orderQueryKeys } from "@/entities/order/hooks/queryKeys";
import { ReviewCreate } from "../model/types";
import { useNotification } from "@/app/providers";

// Хук для создания отзыва
export const useCreateReview = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (input: ReviewCreate) => reviewsApi.create(input),
    onSuccess: () => {
      // Инвалидируем все отзывы продавца (рейтинг обновится)
      queryClient.invalidateQueries({
        queryKey: reviewsQueryKeys.all,
      });
      // Инвалидируем детали продуктов (там reviews[])
      queryClient.invalidateQueries({
        queryKey: productKeys.details(),
      });
      // Инвалидируем списки продуктов (sellerRating, totalReviews)
      queryClient.invalidateQueries({
        queryKey: productKeys.lists(),
      });
      // Инвалидируем заказы покупателя (чтобы UI знал что отзыв оставлен)
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });
      showNotification("Отзыв успешно оставлен", "success");
    },
    onError: (error) => {
      console.error("Ошибка создания отзыва:", error);
      showNotification("Не удалось оставить отзыв", "error");
    },
  });
};

// Хук для удаления отзыва
export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (reviewId: number) => reviewsApi.delete(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: reviewsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: productKeys.details(),
      });
      queryClient.invalidateQueries({
        queryKey: productKeys.lists(),
      });
      showNotification("Отзыв удалён", "success");
    },
    onError: (error) => {
      console.error("Ошибка удаления отзыва:", error);
      showNotification("Не удалось удалить отзыв", "error");
    },
  });
};

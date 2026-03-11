import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAddToCart, useCartChecks } from "@/entities/cart";

interface UseAddToCartFeatureParams {
  onAuthRequired?: (productName?: string) => void;
  onNotification?: (message: string, type: "success" | "error") => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useAddToCartFeature(
  isAuthenticated: boolean,
  params?: UseAddToCartFeatureParams,
) {
  const router = useRouter();
  const { mutate: addToCart, isPending } = useAddToCart();
  const { isProductInCart } = useCartChecks(isAuthenticated);

  const handleAddToCart = useCallback(
    (productId: number, productName?: string) => {
      if (!isAuthenticated) {
        params?.onAuthRequired?.(productName);
        return;
      }

      const isInCart = isProductInCart(productId);

      if (isInCart) {
        router.push("/checkout");
        return;
      }

      // Добавляем товар с количеством 1
      addToCart(
        { productId, count: 1 },
        {
          onSuccess: () => {
            params?.onSuccess?.();
            params?.onNotification?.(
              "Товар успешно добавлен в корзину",
              "success",
            );
          },
          onError: (error) => {
            console.error("Ошибка добавления в корзину:", error);
            params?.onError?.(error);
          },
        },
      );
    },
    [isAuthenticated, isProductInCart, addToCart, router, params],
  );

  return {
    handleAddToCart,
    isPending,
    isAuthenticated,
    isProductInCart,
  };
}

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAddToCart, useCartChecks } from "@/entities/cart";
import { useAuth } from "@/features/auth";

interface UseAddToCartFeatureParams {
  onAuthRequired?: (productName?: string) => void;
  onNotification?: (message: string, type: "success" | "error") => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useAddToCartFeature(params?: UseAddToCartFeatureParams) {
  const router = useRouter();
  const { mutate: addToCart, isPending } = useAddToCart();
  const { isAuthenticated } = useAuth();
  const { isProductInCart } = useCartChecks();

  const handleAddToCart = useCallback(
    (productId: number, productName?: string) => {
      if (!isAuthenticated) {
        params?.onAuthRequired?.(productName);
        return;
      }

      const isInCart = isProductInCart(productId);

      if (isInCart) {
        router.push("/cart");
        return;
      }

      addToCart(productId, {
        onSuccess: () => {
          console.log("Товар успешно добавлен в корзину");
          params?.onSuccess?.();
          params?.onNotification?.(
            "Товар успешно добавлен в корзину",
            "success"
          );
        },
        onError: (error) => {
          console.error("Ошибка добавления в корзину:", error);
          params?.onError?.(error);
        },
      });
    },
    [isAuthenticated, isProductInCart, addToCart, router, params]
  );

  return {
    handleAddToCart,
    isPending,
    isAuthenticated,
    isProductInCart,
  };
}

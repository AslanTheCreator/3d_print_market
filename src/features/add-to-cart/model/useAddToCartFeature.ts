import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAddToCart, useCartChecks } from "@/entities/cart";
import { useProfileUser } from "@/entities/user";
import { ApiError, ErrorCodes } from "@/shared/lib/errorHandler";

const OWN_PRODUCT_MESSAGE = "Нельзя добавить в корзину собственный товар";
const OWNER_CHECK_ERROR_MESSAGE = "Не удалось проверить владельца товара";
const ADD_TO_CART_ERROR_MESSAGE = "Не удалось добавить товар в корзину";

interface UseAddToCartFeatureParams {
  onAuthRequired?: (productName?: string) => void;
  onNotification?: (message: string, type: "success" | "error") => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useAddToCartFeature(
  isAuthenticated: boolean,
  sellerId: number,
  params?: UseAddToCartFeatureParams,
) {
  const router = useRouter();
  const { mutate: addToCart, isPending } = useAddToCart();
  const { isProductInCart } = useCartChecks(isAuthenticated);
  const {
    data: currentUser,
    isPending: isOwnerCheckPending,
    isError: isOwnerCheckError,
  } = useProfileUser({ enabled: isAuthenticated });
  const isOwnProduct = currentUser?.id === sellerId;

  const handleAddToCart = useCallback(
    (productId: number, productName?: string) => {
      if (!isAuthenticated) {
        params?.onAuthRequired?.(productName);
        return;
      }

      if (isOwnerCheckPending || isOwnerCheckError || !currentUser) {
        params?.onNotification?.(OWNER_CHECK_ERROR_MESSAGE, "error");
        return;
      }

      if (isOwnProduct) {
        params?.onNotification?.(OWN_PRODUCT_MESSAGE, "error");
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
            const message =
              error instanceof ApiError &&
              error.isCode(ErrorCodes.OWN_PRODUCT_PURCHASE_FORBIDDEN)
                ? OWN_PRODUCT_MESSAGE
                : ADD_TO_CART_ERROR_MESSAGE;

            params?.onNotification?.(message, "error");
            params?.onError?.(error);
          },
        },
      );
    },
    [
      isAuthenticated,
      isOwnerCheckPending,
      isOwnerCheckError,
      currentUser,
      isOwnProduct,
      isProductInCart,
      addToCart,
      router,
      params,
    ],
  );

  return {
    handleAddToCart,
    isPending,
    isOwnProduct,
    isOwnerCheckPending: isAuthenticated && isOwnerCheckPending,
    isOwnerCheckError: isAuthenticated && isOwnerCheckError,
    isAuthenticated,
    isProductInCart,
  };
}

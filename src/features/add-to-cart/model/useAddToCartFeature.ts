import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cartKeys, useAddToCart, useCartChecks } from "@/entities/cart";
import { productKeys } from "@/entities/product";
import { useProfileUser } from "@/entities/user";
import { ApiError, ErrorCodes } from "@/shared/lib/errorHandler";

const OWN_PRODUCT_MESSAGE = "Нельзя добавить в корзину собственный товар";
const OWNER_CHECK_ERROR_MESSAGE = "Не удалось проверить владельца товара";
const ADD_TO_CART_ERROR_MESSAGE = "Не удалось добавить товар в корзину";
const PRODUCT_NOT_PURCHASABLE_MESSAGE =
  "Этот товар можно приобрести только через канал продавца";

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
  const queryClient = useQueryClient();
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
            let message = ADD_TO_CART_ERROR_MESSAGE;

            if (error instanceof ApiError) {
              if (error.isCode(ErrorCodes.OWN_PRODUCT_PURCHASE_FORBIDDEN)) {
                message = OWN_PRODUCT_MESSAGE;
              } else if (error.isCode(ErrorCodes.PRODUCT_NOT_PURCHASABLE)) {
                message = PRODUCT_NOT_PURCHASABLE_MESSAGE;
                void Promise.allSettled([
                  queryClient.invalidateQueries({ queryKey: cartKeys.all }),
                  queryClient.invalidateQueries({ queryKey: productKeys.all }),
                ]);
              }
            }

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
      queryClient,
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

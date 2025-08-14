import { useCallback, useState } from "react";
import { useRemoveFromCart } from "@/entities/cart";

export function useCartItemRemoval() {
  const { mutate: removeFromCart } = useRemoveFromCart();
  const [removingItemIds, setRemovingItemIds] = useState<number[]>([]);

  const handleRemoveItem = useCallback(
    (productId: number) => {
      setRemovingItemIds((prev) => [...prev, productId]);

      removeFromCart(productId, {
        onSuccess: () => {
          console.log("Товар успешно удален из корзины");
        },
        onError: () => {
          console.error("Ошибка удаления товара из корзины");
          alert("Не удалось удалить товар из корзины.");
        },
        onSettled: () => {
          setRemovingItemIds((prev) => prev.filter((id) => id !== productId));
        },
      });
    },
    [removeFromCart]
  );

  return { handleRemoveItem, removingItemIds };
}

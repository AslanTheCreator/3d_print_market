import { useCallback } from "react";
import { CartProductModel } from "@/entities/cart";
import { AddressBaseModel } from "@/entities/address/model/types";
import { TransferBaseModel } from "@/entities/transfer/model/types";
import { useCreateOrder } from "@/entities/order";

import { groupCartItemsBySeller } from "../lib/groupCartItems";
import { CheckoutFormValues } from "./useCheckoutForm";

type UseCheckoutSubmitProps = {
  cartItems: CartProductModel[] | undefined;
  selectedAddress: AddressBaseModel | null;
  selectedTransfers: Record<number, TransferBaseModel | null>;
  onSuccess: () => void;
  onPartialSuccess: (successCount: number, totalCount: number) => void;
  onError: () => void;
};

export const useCheckoutSubmit = ({
  cartItems,
  selectedAddress,
  selectedTransfers,
  onSuccess,
  onPartialSuccess,
  onError,
}: UseCheckoutSubmitProps) => {
  const { mutate: createOrder, isPending } = useCreateOrder();

  const handleSubmit = useCallback(
    async (data: CheckoutFormValues) => {
      if (!cartItems?.length) return;

      const sellerGroups = groupCartItemsBySeller(cartItems);
      const orders = sellerGroups.map((group) => ({
        data: {
          productId: group.items[0]?.id,
          count: group.items[0]?.count,
          addressId: selectedAddress?.id || 0,
          transferId: selectedTransfers[group.sellerId]?.id || 0,
          comment: data.comment[group.sellerId] || "",
        },
        sellerId: group.sellerId,
      }));

      let successCount = 0;

      for (const order of orders) {
        try {
          await new Promise<void>((resolve, reject) => {
            createOrder(order.data, {
              onSuccess: () => {
                successCount++;
                resolve();
              },
              onError: reject,
            });
          });
        } catch (error) {
          console.error(
            `Ошибка при создании заказа для продавца ${order.sellerId}:`,
            error
          );
        }
      }

      if (successCount === orders.length) {
        onSuccess();
      } else if (successCount > 0) {
        onPartialSuccess(successCount, orders.length);
      } else {
        onError();
      }
    },
    [
      cartItems,
      selectedAddress,
      selectedTransfers,
      createOrder,
      onSuccess,
      onPartialSuccess,
      onError,
    ]
  );

  return {
    handleSubmit,
    isSubmitting: isPending,
  };
};

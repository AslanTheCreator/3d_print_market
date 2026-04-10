import { useSendOrderBySeller } from "@/entities/order";

interface OrderShippingParams {
  orderId: number;
  deliveryUrl: string;
  comment?: string;
}

interface UseOrderShippingActionOptions {
  onSuccess?: () => void;
}

interface OrderShippingActionResult {
  sendOrder: (params: OrderShippingParams) => void;
  isPending: boolean;
}

export const useOrderShippingAction = ({
  onSuccess,
}: UseOrderShippingActionOptions = {}): OrderShippingActionResult => {
  const mutation = useSendOrderBySeller();

  const sendOrder = (params: OrderShippingParams) => {
    mutation.mutate(params, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  };

  return {
    sendOrder,
    isPending: mutation.isPending,
  };
};

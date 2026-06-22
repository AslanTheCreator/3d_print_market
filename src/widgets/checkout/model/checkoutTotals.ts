import { ProductBasket } from "@/entities/cart";
import { Currency, Transfer } from "@/shared/types";

interface QuantityItem {
  productId: number;
  quantity: number;
}

interface CalculateCheckoutTotalsProps {
  cartItems: ProductBasket[];
  quantityItems: QuantityItem[];
  deliveryTransfers: Transfer[];
}

export interface CheckoutTotals {
  itemsCount: number;
  productTotals: Map<Currency, number>;
  deliveryTotals: Map<Currency, number>;
  orderTotals: Map<Currency, number>;
}

export const calculateCheckoutTotals = ({
  cartItems,
  quantityItems,
  deliveryTransfers,
}: CalculateCheckoutTotalsProps): CheckoutTotals => {
  const quantitiesByProductId = new Map(
    quantityItems.map((item) => [item.productId, item.quantity]),
  );
  const productTotals = new Map<Currency, number>();
  const deliveryTotals = new Map<Currency, number>();
  let itemsCount = 0;

  for (const item of cartItems) {
    const quantity = quantitiesByProductId.get(item.product.id) ?? 1;
    const currentTotal = productTotals.get(item.product.currency) ?? 0;

    productTotals.set(
      item.product.currency,
      currentTotal + item.product.price * quantity,
    );
    itemsCount += quantity;
  }

  for (const transfer of deliveryTransfers) {
    const currentTotal = deliveryTotals.get(transfer.currency) ?? 0;
    deliveryTotals.set(transfer.currency, currentTotal + transfer.price);
  }

  const orderTotals = new Map(productTotals);

  for (const [currency, deliveryTotal] of deliveryTotals) {
    orderTotals.set(currency, (orderTotals.get(currency) ?? 0) + deliveryTotal);
  }

  return { itemsCount, productTotals, deliveryTotals, orderTotals };
};

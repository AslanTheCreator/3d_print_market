import { expect, test } from "@playwright/test";
import {
  getOrderPaymentBreakdown,
  type ListOrdersModel,
} from "@/entities/order";

const createOrder = ({
  availability,
  count,
  prepaymentAmount,
  totalPrice,
}: {
  availability: "PURCHASABLE" | "PREORDER";
  count: number;
  prepaymentAmount: number;
  totalPrice: number;
}) =>
  ({
    totalPrice,
    product: {
      availability,
      count,
      prepaymentAmount,
    },
  }) as unknown as ListOrdersModel;

test.describe("order payment breakdown", () => {
  test("uses totalPrice as the product total for a regular order", () => {
    expect(
      getOrderPaymentBreakdown(
        createOrder({
          availability: "PURCHASABLE",
          count: 3,
          prepaymentAmount: 0,
          totalPrice: 3_600,
        }),
      ),
    ).toEqual({
      isPreorder: false,
      quantity: 3,
      prepaymentTotal: 0,
      remainingTotal: 3_600,
      productTotal: 3_600,
    });
  });

  test("separates prepayment and remaining payment for one preorder item", () => {
    expect(
      getOrderPaymentBreakdown(
        createOrder({
          availability: "PREORDER",
          count: 1,
          prepaymentAmount: 250,
          totalPrice: 750,
        }),
      ),
    ).toEqual({
      isPreorder: true,
      quantity: 1,
      prepaymentTotal: 250,
      remainingTotal: 750,
      productTotal: 1_000,
    });
  });

  test("multiplies the per-item prepayment by ordered quantity", () => {
    expect(
      getOrderPaymentBreakdown(
        createOrder({
          availability: "PREORDER",
          count: 2,
          prepaymentAmount: 250,
          totalPrice: 1_500,
        }),
      ),
    ).toEqual({
      isPreorder: true,
      quantity: 2,
      prepaymentTotal: 500,
      remainingTotal: 1_500,
      productTotal: 2_000,
    });
  });
});

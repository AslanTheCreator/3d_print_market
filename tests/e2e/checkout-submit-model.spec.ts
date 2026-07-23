import { expect, test } from "@playwright/test";
import { getFailedOrders } from "@/features/order-create/model/orderCreatePayload";
import {
  markFailedOrdersNonRetryable,
  mergeCheckoutResults,
} from "@/features/order-create/model/orderCreateResult";
import type {
  CheckoutResult,
  OrderResult,
  OrderToCreate,
} from "@/features/order-create";

const resultItem = (
  productId: number,
  status: OrderResult["status"],
  errorMessage?: string,
): OrderResult => ({
  productId,
  productName: `Товар ${productId}`,
  status,
  errorMessage,
});

const checkoutResult = ({
  success = [],
  failed = [],
  totalCount,
}: {
  success?: OrderResult[];
  failed?: OrderResult[];
  totalCount: number;
}): CheckoutResult => ({
  success,
  failed,
  totalCount,
  successCount: success.length,
});

const expectResultInvariants = (result: CheckoutResult) => {
  const successIds = result.success.map((item) => item.productId);
  const failedIds = result.failed.map((item) => item.productId);

  expect(new Set(successIds).size).toBe(successIds.length);
  expect(new Set(failedIds).size).toBe(failedIds.length);
  expect(failedIds.some((productId) => successIds.includes(productId))).toBe(
    false,
  );
  expect(result.successCount).toBe(result.success.length);
  expect(result.success.length + result.failed.length).toBe(result.totalCount);
};

test.describe("checkout submit model", () => {
  test("replaces a repeated failure instead of duplicating it", () => {
    const initialResult = checkoutResult({
      success: [resultItem(1, "success")],
      failed: [resultItem(2, "error", "Первая ошибка")],
      totalCount: 2,
    });
    const firstRetry = checkoutResult({
      failed: [resultItem(2, "error", "Вторая ошибка")],
      totalCount: 1,
    });
    const secondRetry = checkoutResult({
      failed: [resultItem(2, "error", "Третья ошибка")],
      totalCount: 1,
    });

    const afterFirstRetry = mergeCheckoutResults(initialResult, firstRetry);
    const afterSecondRetry = mergeCheckoutResults(
      afterFirstRetry,
      secondRetry,
    );

    expect(afterFirstRetry.failed).toEqual([
      resultItem(2, "error", "Вторая ошибка"),
    ]);
    expect(afterSecondRetry.failed).toEqual([
      resultItem(2, "error", "Третья ошибка"),
    ]);
    expectResultInvariants(afterFirstRetry);
    expectResultInvariants(afterSecondRetry);
  });

  test("moves only successful retried products to success", () => {
    const initialResult = checkoutResult({
      success: [resultItem(1, "success")],
      failed: [
        resultItem(2, "error", "Ошибка 2"),
        resultItem(3, "error", "Ошибка 3"),
      ],
      totalCount: 3,
    });
    const retryResult = checkoutResult({
      success: [resultItem(2, "success")],
      failed: [
        resultItem(3, "error", "Новая ошибка 3"),
        resultItem(99, "error", "Посторонний результат"),
      ],
      totalCount: 3,
    });

    const mergedResult = mergeCheckoutResults(initialResult, retryResult);

    expect(mergedResult.success.map((item) => item.productId)).toEqual([1, 2]);
    expect(mergedResult.failed).toEqual([
      resultItem(3, "error", "Новая ошибка 3"),
    ]);
    expectResultInvariants(mergedResult);
  });

  test("keeps the original payload snapshot for failed orders", () => {
    const orders: OrderToCreate[] = [
      {
        productId: 1,
        productName: "Товар 1",
        count: 2,
        addressId: 50,
        transferId: 101,
        comment: "Исходный комментарий",
      },
      {
        productId: 2,
        productName: "Товар 2",
        count: 4,
        addressId: 50,
        transferId: 101,
        comment: "Исходный комментарий",
      },
    ];

    const failedOrders = getFailedOrders(orders, [
      resultItem(2, "error", "Ошибка"),
    ]);

    expect(failedOrders).toEqual([orders[1]]);
    expect(failedOrders[0]).toBe(orders[1]);
  });

  test("does not retry a product rejected as not purchasable", () => {
    const orders: OrderToCreate[] = [
      {
        productId: 1,
        productName: "Внутренний товар",
        count: 1,
        addressId: 50,
        transferId: 101,
        comment: "",
      },
      {
        productId: 2,
        productName: "Внешний товар",
        count: 1,
        addressId: 50,
        transferId: 101,
        comment: "",
      },
    ];
    const failedResults: OrderResult[] = [
      resultItem(1, "error", "Сетевая ошибка"),
      {
        ...resultItem(
          2,
          "error",
          "Этот товар можно приобрести только через Telegram",
        ),
        errorCode: "PRODUCT_NOT_PURCHASABLE",
        retryable: false,
      },
    ];

    expect(getFailedOrders(orders, failedResults)).toEqual([orders[0]]);
  });

  test("marks a stale external product as non-retryable", () => {
    const initialResult = checkoutResult({
      failed: [
        resultItem(1, "error", "Сетевая ошибка"),
        resultItem(2, "error", "Сетевая ошибка"),
      ],
      totalCount: 2,
    });

    const updatedResult = markFailedOrdersNonRetryable(
      initialResult,
      new Set([2]),
      "PRODUCT_NOT_PURCHASABLE",
      "Этот товар можно приобрести только через Telegram",
    );

    expect(updatedResult.failed).toEqual([
      resultItem(1, "error", "Сетевая ошибка"),
      {
        ...resultItem(
          2,
          "error",
          "Этот товар можно приобрести только через Telegram",
        ),
        errorCode: "PRODUCT_NOT_PURCHASABLE",
        retryable: false,
      },
    ]);
  });
});

import type { CheckoutResult, OrderResult } from "./types";

interface BuildCheckoutResultOptions {
  totalCount: number;
  unknownProductName: string;
  networkErrorMessage: string;
}

const mapRejectedResult = (
  reason: unknown,
  index: number,
  unknownProductName: string,
  networkErrorMessage: string,
): OrderResult => ({
  productId: -(index + 1),
  productName: unknownProductName,
  status: "error",
  errorMessage: reason instanceof Error ? reason.message : networkErrorMessage,
});

export const buildCheckoutResult = (
  results: PromiseSettledResult<OrderResult>[],
  {
    totalCount,
    unknownProductName,
    networkErrorMessage,
  }: BuildCheckoutResultOptions,
): CheckoutResult => {
  const success: OrderResult[] = [];
  const failed: OrderResult[] = [];

  results.forEach((result, index) => {
    const orderResult =
      result.status === "fulfilled"
        ? result.value
        : mapRejectedResult(
            result.reason,
            index,
            unknownProductName,
            networkErrorMessage,
          );

    if (orderResult.status === "success") {
      success.push(orderResult);
      return;
    }

    failed.push(orderResult);
  });

  return {
    success,
    failed,
    totalCount,
    successCount: success.length,
  };
};

export const mergeCheckoutResults = (
  currentResult: CheckoutResult,
  retryResult: CheckoutResult,
): CheckoutResult => {
  const currentSuccess = uniqueByProductId(currentResult.success);
  const currentSuccessIds = new Set(
    currentSuccess.map((item) => item.productId),
  );
  const currentFailed = uniqueByProductId(currentResult.failed).filter(
    (item) => !currentSuccessIds.has(item.productId),
  );
  const retryableProductIds = new Set(
    currentFailed.map((item) => item.productId),
  );
  const retrySuccess = uniqueByProductId(retryResult.success).filter((item) =>
    retryableProductIds.has(item.productId),
  );
  const retrySuccessIds = new Set(
    retrySuccess.map((item) => item.productId),
  );
  const retryFailuresByProductId = new Map(
    uniqueByProductId(retryResult.failed)
      .filter(
        (item) =>
          retryableProductIds.has(item.productId) &&
          !retrySuccessIds.has(item.productId),
      )
      .map((item) => [item.productId, item]),
  );
  const success = uniqueByProductId([...currentSuccess, ...retrySuccess]);
  const failed = currentFailed
    .filter((item) => !retrySuccessIds.has(item.productId))
    .map(
      (item) => retryFailuresByProductId.get(item.productId) ?? item,
    );

  return {
    success,
    failed,
    totalCount: currentResult.totalCount,
    successCount: success.length,
  };
};

const uniqueByProductId = (items: readonly OrderResult[]): OrderResult[] => {
  const uniqueItems = new Map<number, OrderResult>();

  for (const item of items) {
    uniqueItems.set(item.productId, item);
  }

  return [...uniqueItems.values()];
};

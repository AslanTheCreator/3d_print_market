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
  const retrySuccessIds = new Set(
    retryResult.success.map((item) => item.productId),
  );
  const remainingFailed = currentResult.failed.filter(
    (item) => !retrySuccessIds.has(item.productId),
  );

  return {
    success: [...currentResult.success, ...retryResult.success],
    failed: [...remainingFailed, ...retryResult.failed],
    totalCount: currentResult.totalCount,
    successCount: currentResult.successCount + retryResult.successCount,
  };
};

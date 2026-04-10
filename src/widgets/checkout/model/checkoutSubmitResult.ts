import { CheckoutResult, OrderResult } from "./types";

interface BuildCheckoutResultOptions {
  totalCount: number;
  unknownProductName: string;
  networkErrorMessage: string;
}

const getRejectedErrorMessage = (
  reason: unknown,
  fallbackMessage: string,
) => {
  if (reason instanceof Error) {
    return reason.message;
  }

  return fallbackMessage;
};

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

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      if (result.value.status === "success") {
        success.push(result.value);
      } else {
        failed.push(result.value);
      }
      return;
    }

    failed.push({
      productId: 0,
      productName: unknownProductName,
      status: "error",
      errorMessage: getRejectedErrorMessage(
        result.reason,
        networkErrorMessage,
      ),
    });
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
  return {
    success: [...currentResult.success, ...retryResult.success],
    failed: retryResult.failed,
    totalCount: currentResult.totalCount,
    successCount: currentResult.successCount + retryResult.success.length,
  };
};

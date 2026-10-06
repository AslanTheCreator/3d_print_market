import { createStore } from "zustand/vanilla";
import { ApiError, ErrorCodes } from "@/shared/lib/errorHandler";

// Only lifecycle flags survive route unmount. No address, comment or order payload.
const attempts = new WeakMap<AbortSignal, ReturnType<typeof createAttempt>>();
const createAttempt = () => createStore(() => ({ pending: false, uncertain: false }));

export function getCheckoutAttempt(signal: AbortSignal) {
  let attempt = attempts.get(signal);
  if (!attempt) {
    attempt = createAttempt();
    attempts.set(signal, attempt);
  }
  return attempt;
}

export function isConfirmedOrderRejection(error: unknown): error is ApiError {
  return error instanceof ApiError &&
    error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500 &&
    [ErrorCodes.COUNT_INVALID, ErrorCodes.OWN_PRODUCT_PURCHASE_FORBIDDEN,
      ErrorCodes.PRODUCT_NOT_PURCHASABLE, ErrorCodes.TRANSFER_NOT_FOUND,
      ErrorCodes.ACCOUNT_NOT_FOUND].some(code => error.isCode(code));
}

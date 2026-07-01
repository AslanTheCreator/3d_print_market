import { ApiError } from "@/shared/lib/errorHandler";

const DEFAULT_QUERY_RETRIES = 1;

export const shouldRetryQuery = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (failureCount >= DEFAULT_QUERY_RETRIES) {
    return false;
  }

  if (error instanceof ApiError) {
    if (
      error.isUnauthorized() ||
      error.isForbidden() ||
      error.isValidationError()
    ) {
      return false;
    }

    return error.isServerError() || error.code === "NETWORK_ERROR";
  }

  return true;
};

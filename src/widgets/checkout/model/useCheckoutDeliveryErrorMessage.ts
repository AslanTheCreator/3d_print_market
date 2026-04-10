"use client";

import { useMemo } from "react";
import { ApiError } from "@/shared/lib/errorHandler";

interface DeliveryErrorQuery {
  isError: boolean;
  error: unknown;
}

interface UseCheckoutDeliveryErrorMessageProps {
  sellerQueries: DeliveryErrorQuery[];
  fallbackMessage: string;
}

export const useCheckoutDeliveryErrorMessage = ({
  sellerQueries,
  fallbackMessage,
}: UseCheckoutDeliveryErrorMessageProps) => {
  return useMemo(() => {
    const errorQuery = sellerQueries.find((query) => query.isError && query.error);

    if (!errorQuery?.error) {
      return null;
    }

    const error = errorQuery.error;

    if (error instanceof ApiError) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return fallbackMessage;
  }, [fallbackMessage, sellerQueries]);
};

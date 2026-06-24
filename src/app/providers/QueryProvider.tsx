"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/shared/lib/errorHandler";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // Раскомментируйте, если используете

const DEFAULT_STALE_TIME = 30_000;
const DEFAULT_GC_TIME = 5 * 60_000;
const DEFAULT_QUERY_RETRIES = 1;

const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
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

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME,
            gcTime: DEFAULT_GC_TIME,
            retry: shouldRetryQuery,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

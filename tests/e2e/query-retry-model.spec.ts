import { expect, test } from "@playwright/test";
import { AxiosError } from "axios";
import { ApiError, transformToApiError } from "@/shared/lib/errorHandler";
import { shouldRetryQuery } from "@/shared/lib/query";

// P05 / FTA-045: общая policy QueryProvider; явные query overrides проверяются отдельно.
const cases = [
  { name: "validation 400", error: new ApiError("Некорректный запрос", undefined, 400), retryFirst: false },
  { name: "unauthorized 401", error: new ApiError("Требуется вход", undefined, 401), retryFirst: false },
  { name: "forbidden 403", error: new ApiError("Доступ запрещён", undefined, 403), retryFirst: false },
  { name: "server 500", error: new ApiError("Ошибка сервера", undefined, 500), retryFirst: true },
  { name: "server 502", error: new ApiError("Ошибка шлюза", undefined, 502), retryFirst: true },
  { name: "server 503", error: new ApiError("Сервис недоступен", undefined, 503), retryFirst: true },
  { name: "server 504", error: new ApiError("Ошибка шлюза", undefined, 504), retryFirst: true },
  {
    name: "network error transformed from Axios",
    error: transformToApiError(new AxiosError("Синтетический отказ сети", AxiosError.ERR_NETWORK)),
    retryFirst: true,
  },
  // Запрет по HTTP-статусу сохраняет приоритет даже при наличии network code.
  { name: "validation 400 with network code", error: new ApiError("Некорректный запрос", "NETWORK_ERROR", 400), retryFirst: false },
  { name: "unauthorized 401 with network code", error: new ApiError("Требуется вход", "NETWORK_ERROR", 401), retryFirst: false },
  { name: "forbidden 403 with network code", error: new ApiError("Доступ запрещён", "NETWORK_ERROR", 403), retryFirst: false },
];

for (const { name, error, retryFirst } of cases) {
  for (const failureCount of [0, 1, 2]) {
    test(`default query retry: ${name}, failureCount=${failureCount}`, () => {
      expect(error).toBeInstanceOf(ApiError);
      expect(shouldRetryQuery(failureCount, error)).toBe(failureCount === 0 && retryFirst);
    });
  }
}

for (const failureCount of [1, 2]) {
  test(`default query retry limit also applies to non-API errors, failureCount=${failureCount}`, () => {
    expect(shouldRetryQuery(failureCount, new Error("Синтетический отказ query"))).toBe(false);
  });
}

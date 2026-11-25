import { exactInteger } from "../lib/exactInteger";
import type { AxiosRequestConfig } from "axios";

// Успешный ответ проверяется по исходному тексту. Интерцептору ошибок нужен JSON backend.
export const orderTextResponse = {
  responseType: "text",
  transformResponse(data: unknown, _headers: unknown, status?: number) {
    if (typeof data !== "string" || status === undefined || status < 400) return data;
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return data;
    }
  },
} satisfies AxiosRequestConfig;

export const orderListResponse = {
  ...orderTextResponse,
  transformResponse(data: unknown, headers: unknown, status?: number) {
    if (status !== undefined && status >= 400) return orderTextResponse.transformResponse.call(this, data, headers, status);
    if (typeof data !== "string") throw new Error("Ожидался исходный JSON списка заказов");
    const rows: unknown = JSON.parse(data, (key, value: unknown, context?: { source?: string }) =>
      key === "termsVersion" && value !== null ? exactInteger(value, context?.source, 0) : value);
    if (!Array.isArray(rows)) throw new Error("Некорректный список заказов");
    return rows;
  },
} satisfies AxiosRequestConfig;

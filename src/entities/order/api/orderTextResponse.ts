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

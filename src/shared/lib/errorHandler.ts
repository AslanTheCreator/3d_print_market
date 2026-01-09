import axios, { AxiosError } from "axios";

interface ApiErrorResponse {
  error?: string;
  message?: string;
  timestamp?: string;
  status?: number;
}

/**
 * Кастомный класс ошибки для API
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const errorHandler = {
  /**
   * Извлекает сообщение об ошибке из ответа бэкенда
   */
  extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      // Приоритет: error -> message из response.data
      const backendMessage =
        axiosError.response?.data?.error || axiosError.response?.data?.message;

      if (backendMessage) {
        return backendMessage;
      }

      // Стандартные сообщения для HTTP статусов
      switch (axiosError.response?.status) {
        case 400:
          return "Некорректные данные запроса";
        case 401:
          return "Требуется авторизация";
        case 403:
          return "Доступ запрещен";
        case 404:
          return "Ресурс не найден";
        case 500:
          return "Ошибка сервера";
        default:
          return axiosError.message || "Произошла ошибка";
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Неизвестная ошибка";
  },

  /**
   * Обрабатывает ошибки axios и возвращает ApiError
   */
  handleAxiosError(
    error: unknown,
    fallbackMessage: string = "Произошла ошибка"
  ): ApiError {
    const message = this.extractErrorMessage(error);
    const statusCode = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;

    // Логируем только в dev mode
    if (process.env.NODE_ENV === "development") {
      console.error(`[API Error] ${message}`, {
        statusCode,
        originalError: error,
      });
    }

    return new ApiError(message || fallbackMessage, statusCode, error);
  },
};

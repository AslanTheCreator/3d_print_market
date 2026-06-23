import axios, { AxiosError } from "axios";

/**
 * Структура ошибки от бэкенда
 * Пример: { code: "COUNT_INVALID", message: "Количество должно быть > 0", status: 400, timestamp: "...", details: null }
 */
export interface BackendErrorResponse {
  code: string;
  message: string;
  status?: number;
  timestamp?: string;
  details?: unknown | null;
}

/**
 * Кастомный класс ошибки для API
 * Используется везде в приложении вместо сырого AxiosError
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown,
    public timestamp?: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "ApiError";

    // Для корректной работы instanceof в TypeScript
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Проверка на конкретный код ошибки
   * Пример: error.isCode("COUNT_INVALID")
   */
  isCode(code: string): boolean {
    return this.code === code;
  }

  /**
   * Проверка на HTTP статус
   * Пример: error.isStatus(401)
   */
  isStatus(status: number): boolean {
    return this.statusCode === status;
  }

  /**
   * Проверка на ошибку авторизации (401)
   */
  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Проверка на ошибку доступа (403)
   */
  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  /**
   * Проверка на ошибку валидации (400)
   */
  isValidationError(): boolean {
    return this.statusCode === 400;
  }

  /**
   * Проверка на ошибку сервера (5xx)
   */
  isServerError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 500;
  }
}

/**
 * Коды ошибок от бэкенда для type-safe проверок
 */
export const ErrorCodes = {
  // Auth
  BAD_CREDENTIALS: "BAD_CREDENTIALS",
  TOKEN_INVALID_OR_EXPIRED: "TOKEN_INVALID_OR_EXPIRED",
  VERIFICATION_COOLDOWN: "VERIFICATION_COOLDOWN",
  WAITING_VERIFY: "WAITING_VERIFY",
  PARTICIPANT_ALREADY_EXISTS: "PARTICIPANT_ALREADY_EXISTS",

  // Validation
  COUNT_INVALID: "COUNT_INVALID",
  OWN_PRODUCT_PURCHASE_FORBIDDEN: "OWN_PRODUCT_PURCHASE_FORBIDDEN",

  // Product creation
  TRANSFER_NOT_FOUND: "TRANSFER_NOT_FOUND",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  SOCIAL_NETWORK_NOT_FOUND: "SOCIAL_NETWORK_NOT_FOUND",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Fallback сообщения для HTTP статусов (когда бэкенд не вернул message)
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: "Некорректные данные запроса",
  401: "Требуется авторизация",
  403: "Доступ запрещён",
  404: "Ресурс не найден",
  409: "Конфликт данных",
  422: "Ошибка валидации",
  429: "Слишком много запросов",
  500: "Ошибка сервера",
  502: "Сервер временно недоступен",
  503: "Сервис недоступен",
  504: "Превышено время ожидания",
};

/**
 * Проверяет, является ли ответ структурированной ошибкой от бэкенда
 */
function isBackendError(data: unknown): data is BackendErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    typeof data.code === "string" &&
    "message" in data &&
    typeof data.message === "string"
  );
}

/**
 * Трансформирует любую ошибку в ApiError
 * Это основная функция, используемая в interceptor
 */
export function transformToApiError(error: unknown): ApiError {
  // Уже ApiError — возвращаем как есть
  if (error instanceof ApiError) {
    return error;
  }

  // Axios ошибка
  if (axios.isAxiosError(error)) {
    return transformAxiosError(error);
  }

  // Обычная Error
  if (error instanceof Error) {
    return new ApiError(
      error.message,
      undefined,
      undefined,
      undefined,
      undefined,
      error,
    );
  }

  // Неизвестная ошибка
  return new ApiError(
    "Произошла неизвестная ошибка",
    undefined,
    undefined,
    undefined,
    undefined,
    error,
  );
}

/**
 * Трансформирует AxiosError в ApiError
 */
function transformAxiosError(error: AxiosError<unknown>): ApiError {
  const status = error.response?.status;
  const data = error.response?.data;

  // Бэкенд вернул структурированную ошибку
  if (isBackendError(data)) {
    return new ApiError(
      data.message,
      data.code,
      data.status ?? status,
      data.details,
      data.timestamp,
      error,
    );
  }

  // Сетевая ошибка (нет ответа от сервера)
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return new ApiError(
        "Превышено время ожидания ответа",
        "TIMEOUT",
        undefined,
        undefined,
        undefined,
        error,
      );
    }
    if (error.code === "ERR_NETWORK") {
      return new ApiError(
        "Нет соединения с сервером",
        "NETWORK_ERROR",
        undefined,
        undefined,
        undefined,
        error,
      );
    }
    return new ApiError(
      "Ошибка сети",
      "NETWORK_ERROR",
      undefined,
      undefined,
      undefined,
      error,
    );
  }

  // Fallback: используем стандартное сообщение для статуса
  const fallbackMessage = status
    ? HTTP_STATUS_MESSAGES[status] || `Ошибка ${status}`
    : error.message || "Произошла ошибка";

  return new ApiError(
    fallbackMessage,
    undefined,
    status,
    undefined,
    undefined,
    error,
  );
}

/**
 * Логирует ошибку в dev режиме
 * Форматирует вывод для удобства отладки
 */
export function logApiError(error: ApiError, context?: string): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const prefix = context ? `[API Error: ${context}]` : "[API Error]";

  console.group(`${prefix} ${error.code || "UNKNOWN"}`);
  console.error("Message:", error.message);

  if (error.statusCode) {
    console.error("Status:", error.statusCode);
  }

  if (error.code) {
    console.error("Code:", error.code);
  }

  if (error.details) {
    console.error("Details:", error.details);
  }

  if (error.originalError) {
    console.error("Original:", error.originalError);
  }

  console.groupEnd();
}

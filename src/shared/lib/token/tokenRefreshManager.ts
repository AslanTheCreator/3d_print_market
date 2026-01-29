/**
 * TokenRefreshManager - проактивное обновление access токена
 *
 * Стратегия:
 * 1. При инициализации запускает таймер на обновление токена
 * 2. Обновляет токен за REFRESH_BUFFER_MS до истечения
 * 3. При ошибке - повторная попытка через RETRY_DELAY_MS
 * 4. Максимум MAX_RETRY_ATTEMPTS попыток, потом logout
 *
 * @module shared/lib/token/tokenRefreshManager
 */

import { tokenStorage } from "./tokenStorage";

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

/**
 * Время жизни access токена в миллисекундах (должно совпадать с бэкендом)
 * 30 минут = 30 * 60 * 1000
 */
const ACCESS_TOKEN_LIFETIME_MS = 30 * 60 * 1000;

/**
 * За сколько до истечения обновлять токен (2 минуты)
 * Это даёт запас на сетевые задержки
 */
const REFRESH_BUFFER_MS = 2 * 60 * 1000;

/**
 * Задержка между попытками при ошибке (5 секунд)
 */
const RETRY_DELAY_MS = 5 * 1000;

/**
 * Максимум попыток обновления при ошибках
 */
const MAX_RETRY_ATTEMPTS = 3;

// ============================================================================
// ТИПЫ
// ============================================================================

type RefreshTokenFn = () => Promise<boolean>;
type LogoutFn = () => void;

interface TokenRefreshManagerConfig {
  /** Функция обновления токена (из authStore) */
  refreshToken: RefreshTokenFn;
  /** Функция logout (из authStore) */
  logout: LogoutFn;
  /** Кастомное время жизни токена (опционально) */
  tokenLifetimeMs?: number;
  /** Кастомный буфер обновления (опционально) */
  refreshBufferMs?: number;
}

// ============================================================================
// СОСТОЯНИЕ
// ============================================================================

let refreshTimerId: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;
let isInitialized = false;
let config: TokenRefreshManagerConfig | null = null;

// ============================================================================
// ЛОГИРОВАНИЕ (только dev)
// ============================================================================

const log = (message: string, data?: unknown): void => {
  if (process.env.NODE_ENV !== "development") return;

  const timestamp = new Date().toLocaleTimeString();
  if (data !== undefined) {
    console.log(`[TokenRefresh ${timestamp}] ${message}`, data);
  } else {
    console.log(`[TokenRefresh ${timestamp}] ${message}`);
  }
};

const logError = (message: string, error?: unknown): void => {
  if (process.env.NODE_ENV !== "development") return;
  console.error(`[TokenRefresh] ${message}`, error);
};

// ============================================================================
// ВЫЧИСЛЕНИЕ ВРЕМЕНИ
// ============================================================================

/**
 * Вычисляет через сколько мс нужно обновить токен
 *
 * Логика:
 * - Берём время создания токена из tokenStorage
 * - Вычисляем когда он истечёт
 * - Вычитаем буфер (REFRESH_BUFFER_MS)
 * - Возвращаем оставшееся время
 */
const calculateRefreshDelay = (): number => {
  const tokenCreatedAt = tokenStorage.getTokenCreatedAt();
  const tokenLifetime = config?.tokenLifetimeMs ?? ACCESS_TOKEN_LIFETIME_MS;
  const refreshBuffer = config?.refreshBufferMs ?? REFRESH_BUFFER_MS;

  if (!tokenCreatedAt) {
    // Токен только что создан или нет данных - обновляем через стандартное время
    log("No token creation time, using default delay");
    return tokenLifetime - refreshBuffer;
  }

  const now = Date.now();
  const tokenExpiresAt = tokenCreatedAt + tokenLifetime;
  const refreshAt = tokenExpiresAt - refreshBuffer;
  const delay = refreshAt - now;

  log("Calculated refresh delay", {
    tokenCreatedAt: new Date(tokenCreatedAt).toLocaleTimeString(),
    tokenExpiresAt: new Date(tokenExpiresAt).toLocaleTimeString(),
    refreshAt: new Date(refreshAt).toLocaleTimeString(),
    delayMs: delay,
    delayMinutes: Math.round(delay / 60000),
  });

  // Если время уже прошло - обновляем немедленно (но с минимальной задержкой)
  return Math.max(delay, 1000);
};

// ============================================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================================

/**
 * Выполняет обновление токена
 */
const performRefresh = async (): Promise<void> => {
  if (!config) {
    logError("TokenRefreshManager not initialized");
    return;
  }

  const hasRefreshToken = !!tokenStorage.getRefreshToken();
  if (!hasRefreshToken) {
    log("No refresh token, stopping silent refresh");
    stop();
    return;
  }

  log("Performing silent refresh...");

  try {
    const success = await config.refreshToken();

    if (success) {
      log("Silent refresh successful");
      retryCount = 0;
      // Планируем следующее обновление
      scheduleNextRefresh();
    } else {
      handleRefreshFailure(new Error("Refresh returned false"));
    }
  } catch (error) {
    handleRefreshFailure(error);
  }
};

/**
 * Обрабатывает ошибку обновления
 */
const handleRefreshFailure = (error: unknown): void => {
  retryCount++;
  logError(
    `Silent refresh failed (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS})`,
    error,
  );

  if (retryCount >= MAX_RETRY_ATTEMPTS) {
    log("Max retry attempts reached, logging out");
    config?.logout();
    stop();
    return;
  }

  // Повторная попытка через RETRY_DELAY_MS
  log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
  refreshTimerId = setTimeout(performRefresh, RETRY_DELAY_MS);
};

/**
 * Планирует следующее обновление токена
 */
const scheduleNextRefresh = (): void => {
  // Очищаем предыдущий таймер
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }

  const delay = calculateRefreshDelay();
  log(`Scheduling next refresh in ${Math.round(delay / 60000)} minutes`);

  refreshTimerId = setTimeout(performRefresh, delay);
};

// ============================================================================
// ПУБЛИЧНЫЙ API
// ============================================================================

export const tokenRefreshManager = {
  /**
   * Инициализирует менеджер обновления токенов
   * Вызывать при старте приложения (в AuthProvider или layout)
   */
  init(managerConfig: TokenRefreshManagerConfig): void {
    if (isInitialized) {
      log("Already initialized, skipping");
      return;
    }

    // Только на клиенте
    if (typeof window === "undefined") {
      return;
    }

    config = managerConfig;
    isInitialized = true;
    retryCount = 0;

    log("Initializing TokenRefreshManager");

    // Запускаем только если есть токены
    const hasTokens =
      !!tokenStorage.getAccessToken() && !!tokenStorage.getRefreshToken();

    if (hasTokens) {
      scheduleNextRefresh();
    } else {
      log("No tokens found, waiting for login");
    }
  },

  /**
   * Запускает/перезапускает таймер обновления
   * Вызывать после успешного логина или верификации
   */
  start(): void {
    if (!isInitialized) {
      log("Not initialized, cannot start");
      return;
    }

    log("Starting refresh timer");
    retryCount = 0;
    scheduleNextRefresh();
  },

  /**
   * Останавливает таймер обновления
   * Вызывать при logout
   */
  stop(): void {
    log("Stopping refresh timer");

    if (refreshTimerId) {
      clearTimeout(refreshTimerId);
      refreshTimerId = null;
    }

    retryCount = 0;
  },

  /**
   * Сбрасывает таймер (например, после ручного refresh)
   * Полезно когда токен обновился через interceptor
   */
  reset(): void {
    log("Resetting refresh timer");
    retryCount = 0;
    scheduleNextRefresh();
  },

  /**
   * Проверяет, инициализирован ли менеджер
   */
  isInitialized(): boolean {
    return isInitialized;
  },

  /**
   * Полностью уничтожает менеджер (для тестов или hot reload)
   */
  destroy(): void {
    this.stop();
    config = null;
    isInitialized = false;
  },
};

// Экспорт типов для использования в других модулях
export type { TokenRefreshManagerConfig };

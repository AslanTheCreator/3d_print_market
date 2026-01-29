/**
 * Token Storage - безопасное хранение токенов в cookies
 *
 * Изменения:
 * - Убран короткий expires для access_token (теперь управляется через refresh)
 * - Добавлено отслеживание времени создания токена
 * - Добавлены методы для работы с временем жизни токена
 *
 * @module shared/lib/token/tokenStorage
 */

import Cookies from "js-cookie";

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const TOKEN_CREATED_AT_KEY = "token_created_at";

/**
 * Время жизни access токена cookie (1 день)
 * ВАЖНО: Реальное время жизни токена контролируется бэкендом (20 минут)
 * Cookie живёт дольше, чтобы мы могли отправить истёкший токен и получить 401
 * для корректной работы refresh механизма
 */
const ACCESS_TOKEN_COOKIE_EXPIRES_DAYS = 1;

/**
 * Время жизни refresh токена (30 дней)
 */
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

// ============================================================================
// УТИЛИТЫ
// ============================================================================

const getCookieOptions = (expiresDays: number): Cookies.CookieAttributes => ({
  expires: expiresDays,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
});

// ============================================================================
// ЭКСПОРТИРУЕМЫЙ API
// ============================================================================

export const tokenStorage = {
  /**
   * Сохраняет токены и время создания
   */
  saveTokens(tokens: { accessToken: string; refreshToken?: string }): void {
    // Сохраняем access token
    Cookies.set(
      ACCESS_TOKEN_KEY,
      tokens.accessToken,
      getCookieOptions(ACCESS_TOKEN_COOKIE_EXPIRES_DAYS),
    );

    // Сохраняем refresh token (если передан)
    if (tokens.refreshToken) {
      Cookies.set(
        REFRESH_TOKEN_KEY,
        tokens.refreshToken,
        getCookieOptions(REFRESH_TOKEN_EXPIRES_DAYS),
      );
    }

    // Сохраняем время создания токена
    Cookies.set(
      TOKEN_CREATED_AT_KEY,
      Date.now().toString(),
      getCookieOptions(ACCESS_TOKEN_COOKIE_EXPIRES_DAYS),
    );
  },

  /**
   * Удаляет все токены при logout
   */
  clearTokens(): void {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    Cookies.remove(TOKEN_CREATED_AT_KEY);
  },

  /**
   * Получает access токен
   */
  getAccessToken(): string | undefined {
    return Cookies.get(ACCESS_TOKEN_KEY);
  },

  /**
   * Получает refresh токен
   */
  getRefreshToken(): string | undefined {
    return Cookies.get(REFRESH_TOKEN_KEY);
  },

  /**
   * Получает время создания токена (timestamp)
   */
  getTokenCreatedAt(): number | null {
    const value = Cookies.get(TOKEN_CREATED_AT_KEY);
    if (!value) return null;

    const timestamp = parseInt(value, 10);
    return isNaN(timestamp) ? null : timestamp;
  },

  /**
   * Проверяет, есть ли валидные токены
   */
  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  },

  /**
   * Проверяет, есть ли refresh токен (для возможности восстановления сессии)
   */
  canRefresh(): boolean {
    return !!this.getRefreshToken();
  },
};

import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export const tokenStorage = {
  // Безопасное сохранение токенов
  saveTokens(tokens: { accessToken: string; refreshToken: string }): void {
    Cookies.set(ACCESS_TOKEN_KEY, tokens.accessToken, {
      expires: 1 / 24 / 3, // 20 минут
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, {
      expires: 30, // 30 дней
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  },

  // Удаление токенов при логауте
  clearTokens(): void {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
  },

  // Получение текущего access токена
  getAccessToken(): string | undefined {
    return Cookies.get(ACCESS_TOKEN_KEY);
  },

  // Получение refresh токена
  getRefreshToken(): string | undefined {
    return Cookies.get(REFRESH_TOKEN_KEY);
  },
};

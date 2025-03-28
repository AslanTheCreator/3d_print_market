import axios, { Axios, AxiosError } from "axios";
import config from "@/shared/config/api";
import { AuthFormModel } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { tokenStorage } from "@/shared/lib/token/tokenStorage";

const API_URL_REGISTER = `${config.apiBaseUrl}/participant`;
const API_URL_LOGIN = `${config.apiBaseUrl}/auth/login`;
const API_URL_REFRESH = `${config.apiBaseUrl}/auth/refresh`;

export const authApi = {
  async registerUser({ login, password }: AuthFormModel) {
    try {
      const { status, data } = await axios.post(
        API_URL_REGISTER,
        { login, password },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (status === 200) {
        console.log("Пользователь успешно зарегестрирован, его id: ", data);
      }
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка регистрации");
    }
  },
  async loginUser({ login, password }: AuthFormModel) {
    try {
      const { data, status } = await axios.post<{
        access_token: string;
        refresh_token: string;
      }>(API_URL_LOGIN, {
        login,
        password,
      });
      const tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };

      console.log("Токен: ", tokens.accessToken);

      tokenStorage.saveTokens(tokens); // Сохраняем токены в куки
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка авторизации");
    }
  },
  async refreshAccessToken() {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      tokenStorage.clearTokens();
      throw new Error("Refresh token отсутствует");
    }

    try {
      const { data: accessToken } = await axios.post<string>(
        API_URL_REFRESH,
        {},
        {
          headers: {
            "X-Refresh-Token": refreshToken,
          },
        }
      );

      tokenStorage.saveTokens({ accessToken, refreshToken });
    } catch (error) {
      tokenStorage.clearTokens();
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка обновления токена доступа"
      );
    }
  },
  logout() {
    tokenStorage.clearTokens();
  },
};

import axios from "axios";
import config from "@/shared/config/api";
import { AuthFormModel } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { tokenStorage } from "@/shared/lib/token/tokenStorage";

const API_URL_REGISTER = `${config.apiBaseUrl}/participant`;
const API_URL_AUTH = `${config.apiBaseUrl}/auth`;

export const authApi = {
  async registerUser({
    mail,
    password,
  }: AuthFormModel): Promise<{ userId: number | null; isSuccess: boolean }> {
    try {
      const { status, data } = await axios.post(
        API_URL_REGISTER,
        { mail, password },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      if (status === 200) {
        console.log("Пользователь успешно зарегестрирован, его id: ", data);
        return { userId: data, isSuccess: true };
      }
      return { userId: null, isSuccess: false };
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка регистрации");
    }
  },
  async loginUser({ mail, password }: AuthFormModel) {
    try {
      const { data } = await axios.post<{
        access_token: string;
        refresh_token: string;
      }>(`${API_URL_AUTH}/login`, {
        mail,
        password,
      });
      const tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };

      tokenStorage.saveTokens(tokens);
      return true;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка авторизации");
    }
  },
  async verifyCode(userId: number, code: string) {
    try {
      const { data } = await axios.post<{
        access_token: string;
        refresh_token: string;
      }>(`${API_URL_AUTH}/verify-code`, {
        userId,
        code,
      });
      const tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
      console.log(tokens);
      tokenStorage.saveTokens(tokens);
      console.log("Код успешно верифицирован: ", code);
      return true;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка верификации кода");
    }
  },
  async refreshAccessToken() {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      tokenStorage.clearTokens();
      throw new Error("Refresh token отсутствует");
    }
    console.log("Обновление токена доступа...");

    try {
      const { data: accessToken } = await axios.post<string>(
        `${API_URL_AUTH}/refresh`,
        {},
        {
          headers: {
            "X-Refresh-Token": refreshToken,
          },
        }
      );
      console.log("Токен доступа успешно обновлен:", accessToken);
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

import { publicClient } from "@/shared/api";
import {
  AuthFormModel,
  RegisterResponse,
  TokensResponse,
  VerificationCodeResponse,
  VerificationCooldownError,
  LoginErrorResponse,
  VerificationRequiredError,
} from "../model/types";
import { errorHandler, tokenStorage } from "@/shared/lib";
import { AxiosError } from "axios";

const API_URL_REGISTER = `/participant`;
const API_URL_AUTH = `/auth`;

export const authApi = {
  async registerUser({
    mail,
    password,
  }: AuthFormModel): Promise<RegisterResponse> {
    try {
      const { status, data } = await publicClient.post<number>(
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
      return { userId: 0, isSuccess: false };
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка регистрации");
    }
  },
  async loginUser({ mail, password }: AuthFormModel): Promise<boolean> {
    try {
      const { data } = await publicClient.post<TokensResponse>(
        `${API_URL_AUTH}/login`,
        {
          mail,
          password,
        }
      );

      tokenStorage.saveTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });

      return true;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 403) {
        const errorData = error.response.data as LoginErrorResponse;

        if (
          errorData.code === "WAITING_VERIFY" &&
          errorData.next === "VERIFY_EMAIL"
        ) {
          // Бросаем кастомную ошибку с email
          throw new VerificationRequiredError(
            errorData.message || "Необходимо подтвердить почту",
            mail
          );
        }
      }

      throw errorHandler.handleAxiosError(error, "Ошибка авторизации");
    }
  },
  async sendVerificationCode(email: string): Promise<VerificationCodeResponse> {
    try {
      const { data: userId } = await publicClient.post(
        `${API_URL_AUTH}/verification/resend`,
        {},
        {
          params: { email },
        }
      );
      return {
        success: true,
        userId,
      };
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 429) {
        const errorData = error.response.data as VerificationCooldownError;

        if (errorData.code === "VERIFICATION_COOLDOWN") {
          return {
            success: false,
            retryAfterSec: errorData.retryAfterSec,
          };
        }
      }

      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при отправке кода верификации"
      );
    }
  },
  async verifyCode(userId: number, code: string): Promise<boolean> {
    try {
      const { data } = await publicClient.post<TokensResponse>(
        `${API_URL_AUTH}/verify-code`,
        {
          userId,
          code,
        }
      );

      tokenStorage.saveTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });

      return true;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка верификации кода");
    }
  },
  async refreshAccessToken(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      tokenStorage.clearTokens();
      throw new Error("Refresh token отсутствует");
    }
    console.log("Обновление токена доступа...");

    try {
      const { data: accessToken } = await publicClient.post<string>(
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
  async passwordReset(email: string): Promise<boolean> {
    try {
      await publicClient.post(
        `${API_URL_AUTH}/password/reset`,
        {},
        {
          params: { email },
        }
      );
      return true;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка сброса пароля");
    }
  },
  logout() {
    tokenStorage.clearTokens();
  },
};

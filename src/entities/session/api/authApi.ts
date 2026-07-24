import { AxiosError, AxiosRequestConfig } from "axios";
import { publicClient } from "@/shared/api";
import { tokenStorage } from "@/shared/lib";
import {
  AuthFormModel,
  LoginErrorResponse,
  RegisterFormModel,
  RegisterResponse,
  TokensResponse,
  VerificationCodeResponse,
  VerificationCooldownError,
  VerificationRequiredError,
} from "../model/types";

const API_URL_REGISTER = `/participant`;
const API_URL_AUTH = `/auth`;

interface AuthRequestConfig extends AxiosRequestConfig {
  _skipErrorTransform?: boolean;
}

const skipErrorTransformConfig: AuthRequestConfig = {
  _skipErrorTransform: true,
};

export const authApi = {
  async registerUser({
    mail,
    password,
    age,
  }: RegisterFormModel): Promise<RegisterResponse> {
    const { status, data } = await publicClient.post<number>(
      API_URL_REGISTER,
      { mail, password, age },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    if (status === 200) {
      return { userId: data, isSuccess: true };
    }

    return { userId: 0, isSuccess: false };
  },

  async loginUser({ mail, password }: AuthFormModel): Promise<boolean> {
    try {
      const { data } = await publicClient.post<TokensResponse>(
        `${API_URL_AUTH}/login`,
        {
          mail,
          password,
        },
        skipErrorTransformConfig,
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
          throw new VerificationRequiredError(
            errorData.message || "Необходимо подтвердить почту",
            mail,
          );
        }
      }

      throw error;
    }
  },

  async sendVerificationCode(email: string): Promise<VerificationCodeResponse> {
    try {
      const { data: userId } = await publicClient.post(
        `${API_URL_AUTH}/verification/resend`,
        undefined,
        {
          ...skipErrorTransformConfig,
          params: { email },
        },
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

      throw error;
    }
  },

  async verifyCode(userId: number, code: string): Promise<boolean> {
    const { data } = await publicClient.post<TokensResponse>(
      `${API_URL_AUTH}/verify-code`,
      {
        userId,
        code,
      },
    );

    tokenStorage.saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });

    return true;
  },

  async refreshAccessToken(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      tokenStorage.clearTokens();
      throw new Error("Refresh token отсутствует");
    }

    const { data: accessToken } = await publicClient.post<string>(
      `${API_URL_AUTH}/refresh`,
      undefined,
      {
        headers: {
          "X-Refresh-Token": refreshToken,
        },
      },
    );

    tokenStorage.saveTokens({ accessToken, refreshToken });
  },

  async passwordReset(email: string): Promise<boolean> {
    await publicClient.post(`${API_URL_AUTH}/password/reset`, undefined, {
      params: { email },
    });

    return true;
  },

  logout(): void {
    tokenStorage.clearTokens();
  },
};

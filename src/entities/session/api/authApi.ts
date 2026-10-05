import { AxiosError, AxiosRequestConfig } from "axios";
import { publicClient } from "@/shared/api";
import { tokenStorage } from "@/shared/lib";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { getSessionSignal } from "../model/sessionGeneration";
import {
  AuthFormModel,
  RegisterFormModel,
  RegisterResponse,
  TokensResponse,
  VerificationCodeResponse,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
    const generation = getSessionSignal();
    try {
      const { data } = await publicClient.post<TokensResponse>(
        `${API_URL_AUTH}/login`,
        {
          mail,
          password,
        },
        skipErrorTransformConfig,
      );

      if (generation.aborted) return false;
      tokenStorage.saveTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });

      return true;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 403) {
        const errorData: unknown = error.response.data;

        if (
          isRecord(errorData) &&
          errorData.code === "WAITING_VERIFY" &&
          errorData.next === "VERIFY_EMAIL"
        ) {
          throw new VerificationRequiredError(
            typeof errorData.message === "string" && errorData.message
              ? errorData.message : "Необходимо подтвердить почту",
            mail,
          );
        }
      }

      throw transformToApiError(error);
    }
  },

  async sendVerificationCode(email: string): Promise<VerificationCodeResponse> {
    try {
      const { data: userId } = await publicClient.post<number>(
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
        const errorData: unknown = error.response.data;

        if (
          isRecord(errorData) &&
          errorData.code === "VERIFICATION_COOLDOWN" &&
          typeof errorData.retryAfterSec === "number" &&
          Number.isFinite(errorData.retryAfterSec) &&
          errorData.retryAfterSec >= 0
        ) {
          return {
            success: false,
            retryAfterSec: errorData.retryAfterSec,
          };
        }
      }

      throw transformToApiError(error);
    }
  },

  async verifyCode(userId: number, code: string): Promise<boolean> {
    const generation = getSessionSignal();
    const { data } = await publicClient.post<TokensResponse>(
      `${API_URL_AUTH}/verify-code`,
      {
        userId,
        code,
      },
    );

    if (generation.aborted) return false;
    tokenStorage.saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });

    return true;
  },

  async refreshAccessToken(refreshToken: string | undefined): Promise<string> {
    if (!refreshToken) {
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

    return accessToken;
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

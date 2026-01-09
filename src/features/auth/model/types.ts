export type AuthFormModel = {
  mail: string;
  password: string;
};

export interface RegisterResponse {
  userId: number;
  isSuccess: boolean;
}

export interface TokensResponse {
  access_token: string;
  refresh_token: string;
}

export interface VerificationCooldownError {
  code: "VERIFICATION_COOLDOWN";
  retryAfterSec: number;
  message: string;
}

export interface VerificationCodeResponse {
  success: boolean;
  userId?: number;
  retryAfterSec?: number;
}

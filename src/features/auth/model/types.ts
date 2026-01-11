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

export interface LoginVerificationRequiredError {
  next: "VERIFY_EMAIL";
  code: "WAITING_VERIFY";
  message: string;
}

export interface LoginErrorResponse {
  next?: string;
  code?: string;
  message?: string;
}

export class VerificationRequiredError extends Error {
  constructor(message: string, public email: string) {
    super(message);
    this.name = "VerificationRequiredError";
  }
}

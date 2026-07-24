"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/widgets/auth-form";
import { VerificationCodeDialog } from "@/features/auth";
import {
  authApi,
  RegisterFormModel,
  useAuthStore,
} from "@/entities/session";
import { ApiError } from "@/shared/lib/errorHandler";
import { useNotification } from "@/shared/ui/notification";

const DEFAULT_POST_AUTH_REDIRECT = "/";

const getPostAuthRedirectPath = (): string => {
  if (typeof window === "undefined") {
    return DEFAULT_POST_AUTH_REDIRECT;
  }

  const redirectPath = new URLSearchParams(window.location.search).get(
    "redirect",
  );

  if (
    !redirectPath ||
    !redirectPath.startsWith("/") ||
    redirectPath.startsWith("//") ||
    redirectPath.startsWith("/auth")
  ) {
    return DEFAULT_POST_AUTH_REDIRECT;
  }

  return redirectPath;
};

export default function RegisterPageClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<number | null>(null);

  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const { showNotification } = useNotification();

  const handleRegister = async ({
    email: mail,
    password,
    age,
  }: {
    email: string;
    password: string;
    age?: number;
  }) => {
    try {
      setIsLoading(true);
      if (age === undefined) {
        showNotification("Введите возраст", "warning");
        return;
      }

      const userData: RegisterFormModel = {
        mail,
        password,
        age,
      };

      const { userId: registeredUserId, isSuccess: isRegistrationSuccessful } =
        await authApi.registerUser(userData);

      if (isRegistrationSuccessful && registeredUserId) {
        setUserId(registeredUserId);
        setUserEmail(mail);
        setIsVerificationOpen(true);
      }
    } catch (error) {
      console.error("Registration failed:", error);

      if (
        error instanceof ApiError &&
        error.isCode("PARTICIPANT_ALREADY_EXISTS")
      ) {
        showNotification(error.message, "warning");
        return;
      }

      showNotification(
        error instanceof ApiError
          ? error.message
          : "Ошибка при регистрации. Попробуйте позже",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async (): Promise<{
    success: boolean;
    retryAfterSec?: number;
  }> => {
    try {
      const result = await authApi.sendVerificationCode(userEmail);

      if (result.success && result.userId) {
        setUserId(result.userId);
        return { success: true };
      }

      if (result.retryAfterSec) {
        return {
          success: false,
          retryAfterSec: result.retryAfterSec,
        };
      }

      return { success: false };
    } catch (error) {
      console.error("Resend code failed:", error);
      throw error;
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!userId) {
      console.error("User ID not found");
      return;
    }

    try {
      setIsVerifying(true);
      const isVerificationSuccessful = await authApi.verifyCode(userId, code);

      if (isVerificationSuccessful) {
        setAuthenticated();
        setIsVerificationOpen(false);
        router.replace(getPostAuthRedirectPath());
      }
    } catch (error) {
      console.error("Verification failed:", error);
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCloseVerification = () => {
    setIsVerificationOpen(false);
    setUserId(null);
    setUserEmail("");
  };

  return (
    <>
      <AuthForm
        title="Регистрация"
        subtitle="У вас уже есть учетная запись?"
        url="/auth/login"
        linkText="Авторизуйтесь"
        buttonTitle="Зарегистрироваться"
        onSubmit={handleRegister}
        isLoading={isLoading}
        passwordAutoComplete="new-password"
        showAgeField
        requirePersonalDataConsent
      />

      <VerificationCodeDialog
        open={isVerificationOpen}
        onClose={handleCloseVerification}
        onVerify={handleVerifyCode}
        onResendCode={handleResendCode}
        email={userEmail}
        isLoading={isVerifying}
      />
    </>
  );
}

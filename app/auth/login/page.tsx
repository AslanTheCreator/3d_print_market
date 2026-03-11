"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/widgets/auth-form";
import {
  PasswordResetDialog,
  VerificationCodeDialog,
  VerificationRequiredError,
  authApi,
} from "@/features/auth";
import { useAuthStore } from "@/shared/lib/auth";
import { useNotification } from "@/shared/ui/notification";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<number | null>(null);

  const login = useAuthStore((state) => state.login);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const { showNotification } = useNotification();

  const handleLogin = async (userLogin: string, password: string) => {
    try {
      setIsLoading(true);

      const isLoginSuccessful = await login(userLogin, password);

      if (isLoginSuccessful) {
        router.push("/");
      }
    } catch (error) {
      console.error("Login failed:", error);

      if (error instanceof VerificationRequiredError) {
        setUserEmail(error.email);

        showNotification(
          "Необходимо подтвердить email. Открываем окно верификации...",
          "warning",
        );

        try {
          const result = await authApi.sendVerificationCode(error.email);

          if (result.success && result.userId) {
            setUserId(result.userId);
            showNotification(
              "Код верификации отправлен на почту",
              "info",
            );
          } else if (result.retryAfterSec) {
            showNotification(
              `Код уже был отправлен. Повторная отправка через ${result.retryAfterSec} сек.`,
              "info",
            );
            setUserId(null);
          }
        } catch (sendError) {
          console.error("Failed to send verification code:", sendError);
          showNotification(
            "Не удалось отправить код. Вы можете повторить попытку в окне верификации.",
            "warning",
          );
        }

        setIsVerificationOpen(true);
      } else {
        showNotification(
          "Ошибка авторизации. Проверьте логин и пароль.",
          "error",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!userId) {
      showNotification(
        "Не удалось определить ID пользователя. Попробуйте повторно отправить код.",
        "error",
      );
      throw new Error("User ID not found");
    }

    try {
      setIsVerifying(true);
      const isVerificationSuccessful = await authApi.verifyCode(userId, code);

      if (isVerificationSuccessful) {
        setAuthenticated();
        setIsVerificationOpen(false);
        showNotification(
          "Email успешно подтвержден!",
          "success",
        );
        router.push("/");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async (): Promise<{
    success: boolean;
    retryAfterSec?: number;
  }> => {
    if (!userEmail) {
      return { success: false };
    }

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

  const handleCloseVerification = () => {
    setIsVerificationOpen(false);
    setUserEmail("");
    setUserId(null);
  };

  const handlePasswordReset = async (email: string) => {
    try {
      await authApi.passwordReset(email);
      showNotification(
        "Временный пароль отправлен на вашу почту",
        "success",
      );
    } catch (error) {
      console.error("Password reset failed:", error);
      throw error;
    }
  };

  return (
    <>
      <AuthForm
        title="Вход в аккаунт"
        subtitle="Войдите или "
        url="/auth/register"
        linkText="зарегистрируйтесь"
        buttonTitle="Войти"
        onSubmit={handleLogin}
        isLoading={isLoading}
        onForgotPassword={() => setIsResetDialogOpen(true)}
      />

      <PasswordResetDialog
        open={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onSubmit={handlePasswordReset}
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

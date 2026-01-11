"use client";

import AuthForm from "@/widgets/auth-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store";
import { useNotification } from "@/app/providers";
import { PasswordResetDialog } from "@/features/auth/ui/PasswordResetDialog";
import { VerificationCodeDialog } from "@/features/auth/ui/VerificationCodeDialog";
import { authApi } from "@/features/auth";
import { VerificationRequiredError } from "@/features/auth/model/types";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Состояние для верификации
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

      // Проверяем на ошибку требования верификации
      if (error instanceof VerificationRequiredError) {
        // Сохраняем email
        setUserEmail(error.email);

        // Показываем уведомление
        showNotification(error.message, "warning");

        // Автоматически отправляем код верификации
        try {
          const result = await authApi.sendVerificationCode(error.email);

          if (result.success && result.userId) {
            setUserId(result.userId);
            showNotification("Код верификации отправлен на почту", "info");
          } else {
            throw new Error("Не удалось получить userId");
          }
        } catch (sendError) {
          console.error("Failed to send verification code:", sendError);
          showNotification("Не удалось отправить код верификации", "error");
          return;
        }

        // Открываем диалог верификации
        setIsVerificationOpen(true);
      } else {
        showNotification(
          "Ошибка авторизации. Проверьте логин и пароль.",
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!userId) {
      console.error("User ID не найден");
      showNotification("Ошибка: не найден ID пользователя", "error");
      return;
    }

    try {
      setIsVerifying(true);
      console.log("Verifying code:", code, "for userId:", userId);

      const isVerificationSuccessful = await authApi.verifyCode(userId, code);

      if (isVerificationSuccessful) {
        setAuthenticated();
        setIsVerificationOpen(false);
        showNotification("Email успешно подтвержден!", "success");
        router.push("/");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      throw error; // Пробрасываем ошибку в диалог
    } finally {
      setIsVerifying(false);
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
        console.log("Код повторно отправлен, userId:", result.userId);
        return { success: true };
      } else if (result.retryAfterSec) {
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
      showNotification("Временный пароль отправлен на вашу почту", "success");
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/widgets/auth-form";
import { PasswordResetDialog, VerificationCodeDialog, VerificationRequiredError, authApi } from "@/features/auth";
import { useAuthStore } from "@/shared/lib/auth";
import { useNotification } from "@/shared/ui/notification";

export const AuthLoginWidget = () => {
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
          "\u041d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c email. \u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c \u043e\u043a\u043d\u043e \u0432\u0435\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438...",
          "warning",
        );

        try {
          const result = await authApi.sendVerificationCode(error.email);

          if (result.success && result.userId) {
            setUserId(result.userId);
            showNotification(
              "\u041a\u043e\u0434 \u0432\u0435\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430 \u043f\u043e\u0447\u0442\u0443",
              "info",
            );
          } else if (result.retryAfterSec) {
            showNotification(
              `\u041a\u043e\u0434 \u0443\u0436\u0435 \u0431\u044b\u043b \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d. \u041f\u043e\u0432\u0442\u043e\u0440\u043d\u0430\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0430 \u0447\u0435\u0440\u0435\u0437 ${result.retryAfterSec} \u0441\u0435\u043a.`,
              "info",
            );
            setUserId(null);
          }
        } catch (sendError) {
          console.error("Failed to send verification code:", sendError);
          showNotification(
            "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043a\u043e\u0434. \u0412\u044b \u043c\u043e\u0436\u0435\u0442\u0435 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c \u043f\u043e\u043f\u044b\u0442\u043a\u0443 \u0432 \u043e\u043a\u043d\u0435 \u0432\u0435\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438.",
            "warning",
          );
        }

        setIsVerificationOpen(true);
      } else {
        showNotification(
          "\u041e\u0448\u0438\u0431\u043a\u0430 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043b\u043e\u0433\u0438\u043d \u0438 \u043f\u0430\u0440\u043e\u043b\u044c.",
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
        "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c ID \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043a\u043e\u0434.",
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
          "Email \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d!",
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
        "\u0412\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430 \u0432\u0430\u0448\u0443 \u043f\u043e\u0447\u0442\u0443",
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
        title="\u0412\u0445\u043e\u0434 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442"
        subtitle="\u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0438\u043b\u0438 "
        url="/auth/register"
        linkText="\u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044c"
        buttonTitle="\u0412\u043e\u0439\u0442\u0438"
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
};

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/widgets/auth-form";
import { AuthFormModel, VerificationCodeDialog, authApi } from "@/features/auth";
import { ApiError } from "@/shared/lib/errorHandler";
import { useAuthStore } from "@/shared/lib/auth";
import { useNotification } from "@/shared/ui/notification";

export const AuthRegisterWidget = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<number | null>(null);

  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const { showNotification } = useNotification();

  const handleRegister = async (mail: string, password: string) => {
    try {
      setIsLoading(true);
      const userData: AuthFormModel = {
        mail,
        password,
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
          : "\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435",
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
        router.push("/");
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
        title="\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f"
        subtitle="\u0423 \u0432\u0430\u0441 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u0443\u0447\u0435\u0442\u043d\u0430\u044f \u0437\u0430\u043f\u0438\u0441\u044c?"
        url="/auth/login"
        linkText="\u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044c"
        buttonTitle="\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f"
        onSubmit={handleRegister}
        isLoading={isLoading}
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

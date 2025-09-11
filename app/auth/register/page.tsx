"use client";

import { useState } from "react";
import AuthForm from "@/widgets/auth-form";
import { authApi } from "@/features/auth/api/authApi";
import { AuthFormModel } from "@/features/auth/model/types";
import { useRouter } from "next/navigation";
import { VerificationCodeDialog } from "@/features/auth/ui/VerificationCodeDialog";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<number | null>(null);

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
        // Сохраняем данные для верификации
        setUserId(registeredUserId);
        setUserEmail(mail);
        setIsVerificationOpen(true);
      }
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!userId) {
      console.error("User ID не найден");
      return;
    }

    try {
      setIsVerifying(true);
      const isVerificationSuccessful = await authApi.verifyCode(userId, code);

      if (isVerificationSuccessful) {
        setIsVerificationOpen(false);
        router.push("/");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      // Ошибка будет обработана в VerificationCodeDialog через throw
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCloseVerification = () => {
    setIsVerificationOpen(false);
    // Опционально: можно очистить состояние
    setUserId(null);
    setUserEmail("");
  };

  // Опционально: функция для повторной отправки кода
  const handleResendCode = async () => {
    if (!userEmail || !userId) return;

    try {
      // Если у вас есть API для повторной отправки кода
      // await authApi.resendVerificationCode(userId);
      console.log("Код отправлен повторно");
    } catch (error) {
      console.error("Failed to resend code:", error);
      throw error;
    }
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
      />

      <VerificationCodeDialog
        open={isVerificationOpen}
        onClose={handleCloseVerification}
        onVerify={handleVerifyCode}
        email={userEmail}
        isLoading={isVerifying}
        onResendCode={handleResendCode} // Если не нужно, можно убрать
        isResending={false} // Если нужно, добавьте состояние для этого
      />
    </>
  );
}

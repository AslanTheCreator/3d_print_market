"use client";

import { useState } from "react";
import AuthForm from "@/widgets/auth-form";
import { authApi } from "@/features/auth/api/authApi";
import { AuthFormModel } from "@/features/auth/model/types";
import { useRouter } from "next/navigation";
import { VerificationCodeDialog } from "@/features/auth/ui/VerificationCodeDialog";
import { useAuthStore } from "@/app/store";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<number | null>(null);

  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

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
      console.log("Verifying code:", code);
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
    // Опционально: можно очистить состояние
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
      />

      <VerificationCodeDialog
        open={isVerificationOpen}
        onClose={handleCloseVerification}
        onVerify={handleVerifyCode}
        email={userEmail}
        isLoading={isVerifying}
      />
    </>
  );
}

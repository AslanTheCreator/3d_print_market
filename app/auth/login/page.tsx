"use client";

import AuthForm from "@/widgets/auth-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store";
import { useNotification } from "@/app/providers";
import { PasswordResetDialog } from "@/features/auth/ui/PasswordResetDialog";
import { authApi } from "@/features/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const login = useAuthStore((state) => state.login);
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
      showNotification(
        "Ошибка авторизации. Проверьте логин и пароль.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
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
    </>
  );
}

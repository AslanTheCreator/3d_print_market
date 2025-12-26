"use client";
import AuthForm from "@/widgets/auth-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store";
import { useNotification } from "@/app/providers";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <AuthForm
      title="Вход в аккаунт"
      subtitle="Войдите или "
      url="/auth/register"
      linkText="зарегистрируйтесь"
      buttonTitle="Войти"
      onSubmit={handleLogin}
      isLoading={isLoading}
    />
  );
}

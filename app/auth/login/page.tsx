"use client";

import { authApi } from "@/features/auth/api/authApi";
import AuthForm from "@/widgets/auth-form";
import { useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/shared/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (userLogin: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const isLoginSuccessful = await login(userLogin, password);

      if (isLoginSuccessful) {
        router.push("/");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError("Ошибка авторизации. Проверьте логин и пароль.");
    } finally {
      setIsLoading(false);
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
      />
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}

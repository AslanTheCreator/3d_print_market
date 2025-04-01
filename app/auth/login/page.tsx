"use client";

import { authApi } from "@/features/auth/api/authApi";
import AuthForm from "@/widgets/auth-form";
import { useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const handleLogin = async (login: string, password: string) => {
    try {
      const userData = {
        login,
        password,
      };
      const isLoginSuccessful = await authApi.loginUser(userData);
      if (isLoginSuccessful) {
        router.push("/");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError("Ошибка авторизации. Проверьте логин и пароль.");
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

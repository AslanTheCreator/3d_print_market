"use client";

import { authApi } from "@/features/auth/api/authApi";
import AuthForm from "@/widgets/auth-form";
import { useState } from "react";
import { Snackbar, Alert } from "@mui/material";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const handleLogin = async (login: string, password: string) => {
    try {
      const userData = {
        login,
        password,
      };
      await authApi.loginUser(userData);
      // Здесь можно добавить редирект на главную страницу или другие действия после успешного входа
    } catch (error) {
      console.error("Login failed:", error);
      setError("Ошибка авторизации. Проверьте логин и пароль.");
      // Здесь можно добавить обработку ошибок, например, показать уведомление
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

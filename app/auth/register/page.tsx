"use client";

import { useState } from "react";
import AuthForm from "@/widgets/auth-form";
import { authApi } from "@/features/auth/api/authApi";
import { AuthFormModel } from "@/features/auth/model/types";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const handleRegister = async (login: string, password: string) => {
    try {
      setIsLoading(true);
      const userData: AuthFormModel = {
        login,
        password,
      };
      const isRegistrationSuccessful = await authApi.registerUser(userData);
      if (isRegistrationSuccessful) {
        await authApi.loginUser(userData);
        router.push("/");
      }
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthForm
      title="Регистрация"
      subtitle="У вас уже есть учетная запись?"
      url="/auth/login"
      linkText="Авторизуйтесь"
      buttonTitle="Зарегистрироваться"
      onSubmit={handleRegister}
      isLoading={isLoading}
    />
  );
}

"use client";

import { useState } from "react";
import AuthForm from "@/widgets/auth-form";
import { registerUser } from "@/features/auth/api/register";
import { User } from "@/entities/user";
import { RegisterUserDTO } from "@/shared/api/dto/userRegister.dto";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const handleRegister = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userData: RegisterUserDTO = {
        login: email,
        password: password,
      };
      await registerUser(userData);
      // Здесь можно добавить редирект на страницу логина или другие действия после успешной регистрации
    } catch (error) {
      console.error("Registration failed:", error);
      // Здесь можно добавить обработку ошибок, например, показать уведомление
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

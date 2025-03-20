import { useState, useEffect } from "react";
import { loginUser } from "@/shared/api/auth";
import { RegisterUserDTO } from "@/shared/api/dto/userRegister.dto";

export const useAuth = ({ login, password }: RegisterUserDTO) => {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      try {
        setIsLoading(true);
        const authToken = await loginUser(login, password);
        setToken(authToken.accessToken);
      } catch (error) {
        console.error("Ошибка авторизации:", error);
        setError(
          error instanceof Error ? error : new Error("Неизвестная ошибка")
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  return { token, isLoading, error };
};

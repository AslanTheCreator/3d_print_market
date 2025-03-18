import { useState, useEffect } from "react";
import { login } from "@/shared/api/auth";

export const useAuth = () => {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      try {
        setIsLoading(true);
        const authToken = await login("user43", "stas");
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

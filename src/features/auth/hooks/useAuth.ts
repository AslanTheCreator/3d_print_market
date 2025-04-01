import { useState, useEffect } from "react";
import { tokenStorage } from "@/shared/lib/token/tokenStorage";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const accessToken = tokenStorage.getAccessToken();
    setIsAuthenticated(!!accessToken);
    console.log(isAuthenticated);
  }, [isAuthenticated]);

  const checkAuthStatus = () => {
    const accessToken = tokenStorage.getAccessToken();
    const authenticated = !!accessToken;
    setIsAuthenticated(authenticated);
    return authenticated;
  };

  return {
    isAuthenticated,
    checkAuthStatus,
  };
};

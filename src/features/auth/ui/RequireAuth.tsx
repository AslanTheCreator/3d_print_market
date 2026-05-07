"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Container } from "@mui/material";
import { useAuth } from "../model/useAuth";

const LOGIN_PATH = "/auth/login";

interface RequireAuthProps {
  children: ReactNode;
}

const getLoginRedirectPath = (): string => {
  const redirectPath =
    typeof window === "undefined"
      ? "/dashboard"
      : `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ redirect: redirectPath });

  return `${LOGIN_PATH}?${params.toString()}`;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace(getLoginRedirectPath());
    }
  }, [isAuthenticated, isInitialized, router]);

  if (!isInitialized || !isAuthenticated) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
          }}
        >
          <CircularProgress size={40} />
        </Box>
      </Container>
    );
  }

  return children;
}

"use client";
import { type ReactNode, useEffect } from "react";
import { Alert, Box, Button } from "@mui/material";
import { useAuth, useAccountSessionKey } from "@/entities/session";
import { useSessionProfile } from "@/entities/user";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { ApiError } from "@/shared/lib/errorHandler";

export function AdminAccess({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { logout } = auth;
  const sessionKey = useAccountSessionKey();
  const profile = useSessionProfile(sessionKey);
  const unauthorized = profile.error instanceof ApiError && profile.error.statusCode === 401;
  useEffect(() => {
    if (unauthorized) logout();
  }, [unauthorized, logout]);
  useEffect(() => {
    if (auth.isInitialized && !auth.isAuthenticated) {
      window.location.replace(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [auth.isInitialized, auth.isAuthenticated]);
  if (!auth.isInitialized || !auth.isAuthenticated || profile.isPending || !profile.isFetchedAfterMount) return <Box p={3}><RequestFeedback pending /></Box>;
  if (profile.error) return <Box p={3}><RequestFeedback error={profile.error} retry={() => void profile.refetch()} /></Box>;
  if (profile.data.role !== "ADMIN") return <Box p={3}><Alert severity="error">Доступ разрешён только администратору.</Alert><Button href="/dashboard">В кабинет</Button></Box>;
  return <div key={sessionKey}>{children}</div>;
}

export function AdminEntryLink() {
  const sessionKey = useAccountSessionKey();
  const profile = useSessionProfile(sessionKey);
  return profile.data?.role === "ADMIN" ? <Button component="a" href="/admin" variant="outlined" sx={{ mb: 2 }}>Администрирование</Button> : null;
}

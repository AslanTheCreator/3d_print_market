"use client";
import { type ReactNode, type SyntheticEvent, useEffect, useRef } from "react";
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { useAuth, useAccountSessionKey } from "@/entities/session";
import { useSessionProfile } from "@/entities/user";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { ApiError } from "@/shared/lib/errorHandler";

export function AdminAccess({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { logout } = auth;
  const sessionKey = useAccountSessionKey();
  const profile = useSessionProfile(sessionKey);
  // Cached ADMIN не заменяет успешную проверку после монтирования этого guard.
  const confirmedSession = useRef<number | null>(null);
  if (profile.isSuccess && profile.isFetchedAfterMount && profile.data.role === "ADMIN") confirmedSession.current = sessionKey;
  const initialized = sessionKey !== null && confirmedSession.current === sessionKey;
  const unauthorized = profile.error instanceof ApiError && profile.error.statusCode === 401;
  const accessUnverified = !!profile.error;
  // Capture также блокирует submit и действия в React portals вне inert DOM-дерева.
  const blockUnverifiedAction = (event: SyntheticEvent) => {
    if (!accessUnverified) return;
    event.preventDefault();
    event.stopPropagation();
  };
  useEffect(() => {
    if (unauthorized) logout();
  }, [unauthorized, logout]);
  useEffect(() => {
    if (auth.isInitialized && !auth.isAuthenticated) {
      window.location.replace(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [auth.isInitialized, auth.isAuthenticated]);
  if (!auth.isInitialized || !auth.isAuthenticated || profile.isPending || !profile.isFetchedAfterMount) return <Box p={3}><RequestFeedback pending /></Box>;
  if (profile.error && (!initialized || unauthorized)) return <Box p={3}><RequestFeedback error={profile.error} retry={() => void profile.refetch()} /></Box>;
  if (profile.data?.role !== "ADMIN") return <Box p={3}><Alert severity="error">Доступ разрешён только администратору.</Alert><Button href="/dashboard">В кабинет</Button></Box>;
  return <div key={sessionKey}>
    <Dialog open={accessUnverified} aria-labelledby="admin-access-error-title" fullWidth maxWidth="sm">
      <DialogTitle id="admin-access-error-title">Не удалось проверить доступ</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>Действия недоступны до успешной повторной проверки; несохранённый ввод сохранён.</Alert>
        <RequestFeedback error={profile.error} retry={() => void profile.refetch()} />
      </DialogContent>
    </Dialog>
    <Box component="fieldset" disabled={accessUnverified} inert={accessUnverified}
      onClickCapture={blockUnverifiedAction} onSubmitCapture={blockUnverifiedAction} onKeyDownCapture={blockUnverifiedAction} onChangeCapture={blockUnverifiedAction}
      sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
      {children}
    </Box>
  </div>;
}

export function AdminEntryLink() {
  const sessionKey = useAccountSessionKey();
  const profile = useSessionProfile(sessionKey);
  return profile.data?.role === "ADMIN" ? <Button component="a" href="/admin" variant="outlined" sx={{ mb: 2 }}>Администрирование</Button> : null;
}

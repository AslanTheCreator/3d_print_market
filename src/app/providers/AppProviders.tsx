"use client";

import { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/app/config/theme";
import { QueryProvider } from "./QueryProvider";
import { AuthProvider } from "./AuthProvider";
import { PrivateDataBoundary } from "./PrivateDataBoundary";
import { useUnsavedChangesNavigation } from "@/shared/lib";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  useUnsavedChangesNavigation();
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <QueryProvider><PrivateDataBoundary>{children}</PrivateDataBoundary></QueryProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}

"use client";

import { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/app/styles/theme";
import { QueryProvider } from "./QueryProvider";
import { ConfigProvider } from "./ConfigProvider";
import { NotificationProvider } from "./NotificationProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryProvider>
          <ConfigProvider>
            <NotificationProvider maxNotifications={3}>
              {children}
            </NotificationProvider>
          </ConfigProvider>
        </QueryProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}

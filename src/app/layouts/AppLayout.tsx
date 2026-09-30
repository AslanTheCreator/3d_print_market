"use client";

import { ReactNode, useEffect, useMemo, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Box, GlobalStyles, IconButton } from "@mui/material";
import { Header } from "@/widgets/header";
import { Footer } from "@/widgets/footer";
import { useAuthStore } from "@/entities/session";
import {
  MobileAccountMenu,
  MobileBottomNavigation,
} from "@/widgets/mobile-navigation";
import { NotificationProvider } from "@/shared/ui/notification";
import { getMobileChromeConfig } from "./mobileChrome";
import { MetrikaHead } from "../analytics/MetrikaHead";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const initialAdmin = useRef(isAdmin);
  const crossingBoundary = initialAdmin.current !== isAdmin;
  useEffect(() => {
    if (crossingBoundary) window.location.replace(window.location.href);
  }, [crossingBoundary]);
  const isGuest = useAuthStore((state) => state.isInitialized && !state.isAuthenticated);
  const mobileChrome = useMemo(
    () => getMobileChromeConfig(pathname, isGuest),
    [pathname, isGuest],
  );
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [pathname]);

  const accountMenuAction = mobileChrome.showAccountMenu ? (
    <IconButton
      type="button"
      aria-label="Открыть меню разделов профиля"
      aria-haspopup="dialog"
      aria-expanded={isAccountMenuOpen}
      aria-controls="mobile-account-menu"
      onClick={() => setIsAccountMenuOpen(true)}
      sx={{ color: "common.white" }}
    >
      <MenuRoundedIcon />
    </IconButton>
  ) : undefined;

  if (crossingBoundary) return null;
  if (isAdmin) return <NotificationProvider maxNotifications={3}>{children}</NotificationProvider>;

  return (
    <Box
      data-testid="app-chrome"
      data-mobile-chrome-mode={mobileChrome.mode}
      sx={{
        minHeight: "100dvh",
      }}
    >
      <GlobalStyles
        styles={(theme) => ({
          "html:root": {
            "--shell-bottom-offset": mobileChrome.showBottomNavigation
              ? "calc(64px + env(safe-area-inset-bottom, 0px))"
              : "0px",
            [theme.breakpoints.up("md")]: {
              "--shell-bottom-offset": "0px",
            },
          },
        })}
      />
      <NotificationProvider maxNotifications={3}>
        <MetrikaHead />
        <Header
          mobileConfig={mobileChrome}
          mobileAction={accountMenuAction}
        />

        <Box
          sx={{
            pt: "var(--shell-top-offset)",
            pb: "var(--shell-bottom-offset)",
          }}
        >
          <main className="main">{children}</main>

          <Box
            sx={{
              display: {
                xs: mobileChrome.showMobileFooter ? "block" : "none",
                md: "block",
              },
            }}
          >
            <Footer mobileCompact={isGuest && pathname === "/favorites"} />
          </Box>
        </Box>

        {mobileChrome.showBottomNavigation && <MobileBottomNavigation />}

        <MobileAccountMenu
          open={isAccountMenuOpen}
          onClose={() => setIsAccountMenuOpen(false)}
        />
      </NotificationProvider>
    </Box>
  );
}

"use client";

import {
  Box,
  CircularProgress,
  Dialog,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import ShieldIcon from "@mui/icons-material/Shield";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/entities/session";

interface AccountDestination {
  label: string;
  href: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
}

const accountDestinations: AccountDestination[] = [
  {
    label: "Обзор",
    href: "/dashboard",
    icon: <DashboardIcon />,
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    label: "Мои товары",
    href: "/dashboard/products",
    icon: <InventoryIcon />,
    isActive: (pathname) =>
      pathname === "/dashboard/products" ||
      (pathname.startsWith("/dashboard/products/") &&
        pathname !== "/dashboard/products/new"),
  },
  {
    label: "Покупки",
    href: "/dashboard/purchase",
    icon: <ShoppingBagIcon />,
    isActive: (pathname) => pathname.startsWith("/dashboard/purchase"),
  },
  {
    label: "Продажи",
    href: "/dashboard/sales",
    icon: <TrendingUpIcon />,
    isActive: (pathname) => pathname.startsWith("/dashboard/sales"),
  },
  {
    label: "Создать товар",
    href: "/dashboard/products/new",
    icon: <AccessTimeIcon />,
    isActive: (pathname) => pathname === "/dashboard/products/new",
  },
  {
    label: "Настройки",
    href: "/dashboard/settings",
    icon: <SettingsIcon />,
    isActive: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
  {
    label: "Безопасность",
    href: "/dashboard/security",
    icon: <ShieldIcon />,
    isActive: (pathname) => pathname.startsWith("/dashboard/security"),
  },
];

export interface MobileAccountMenuProps {
  open: boolean;
  onClose: () => void;
  id?: string;
}

export const MobileAccountMenu = ({
  open,
  onClose,
  id = "mobile-account-menu",
}: MobileAccountMenuProps) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (open && isDesktop) onClose();
  }, [isDesktop, onClose, open]);

  const handleLogout = () => {
    try {
      setIsLoggingOut(true);
      logout();
      queryClient.removeQueries();
      onClose();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Dialog
      id={id}
      fullScreen
      open={open}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      PaperProps={{
        style: {
          margin: 0,
          width: "100%",
          maxWidth: "none",
          borderRadius: 0,
        },
        sx: {
          m: 0,
          width: "100%",
          maxWidth: "none",
          height: "100dvh",
          maxHeight: "100dvh",
          borderRadius: 0,
          bgcolor: "background.default",
          overscrollBehavior: "contain",
        },
      }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          minHeight: "calc(56px + env(safe-area-inset-top, 0px))",
          px: 1,
          pt: "env(safe-area-inset-top, 0px)",
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <IconButton
          onClick={onClose}
          aria-label="Закрыть меню профиля"
          sx={{ width: 44, height: 44 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography id={`${id}-title`} component="h2" variant="h6" fontWeight={700}>
          Профиль
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: { xs: 1.5, sm: 3 },
          pt: 1.5,
          pb: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        <List component="nav" aria-label="Разделы личного кабинета" disablePadding>
          {accountDestinations.map((item) => {
            const isActive = item.isActive(pathname);

            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={isActive}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
                sx={{ minHeight: 52, borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 42 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: isActive ? 700 : 500 }}
                />
              </ListItemButton>
            );
          })}

          <Divider sx={{ my: 1 }} />
          <ListItemButton
            onClick={handleLogout}
            disabled={isLoggingOut}
            sx={{ minHeight: 52, borderRadius: 2, color: "error.main" }}
          >
            <ListItemIcon sx={{ minWidth: 42, color: "inherit" }}>
              {isLoggingOut ? (
                <CircularProgress size={22} color="error" />
              ) : (
                <LogoutIcon />
              )}
            </ListItemIcon>
            <ListItemText
              primary={isLoggingOut ? "Выход..." : "Выйти"}
              primaryTypographyProps={{ fontWeight: 600 }}
            />
          </ListItemButton>
        </List>
      </Box>
    </Dialog>
  );
};

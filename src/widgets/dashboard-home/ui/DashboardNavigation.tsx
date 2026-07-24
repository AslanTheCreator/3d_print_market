"use client";

import React, { useState } from "react";
import {
  Badge,
  Box,
  ButtonBase,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  alpha,
  useTheme,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Logout as LogoutIcon,
  MoreHoriz as MoreHorizIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  ShoppingBag as ShoppingBagIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoutButton } from "@/features/auth";
import { LAYOUT } from "@/shared/config";
import { useAuthStore } from "@/entities/session";

interface NavigationItem {
  text: string;
  shortText: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  color: string;
  isActive?: (pathname: string) => boolean;
}

const navigationItems: NavigationItem[] = [
  {
    text: "Обзор",
    shortText: "Обзор",
    icon: <DashboardIcon />,
    href: "/dashboard",
    color: "#ef4284",
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    text: "Мои товары",
    shortText: "Товары",
    icon: <InventoryIcon />,
    href: "/dashboard/products",
    color: "#f44336",
    isActive: (pathname) =>
      pathname === "/dashboard/products" ||
      (pathname.startsWith("/dashboard/products/") &&
        !pathname.startsWith("/dashboard/products/new")),
  },
  {
    text: "Покупки",
    shortText: "Покупки",
    icon: <ShoppingBagIcon />,
    href: "/dashboard/purchase",
    color: "#4caf50",
    isActive: (pathname) => pathname.startsWith("/dashboard/purchase"),
  },
  {
    text: "Продажи",
    shortText: "Продажи",
    icon: <TrendingUpIcon />,
    href: "/dashboard/sales",
    color: "#ff9800",
    isActive: (pathname) => pathname.startsWith("/dashboard/sales"),
  },
  {
    text: "Создать товар",
    shortText: "Создать",
    icon: <AccessTimeIcon />,
    href: "/dashboard/products/new",
    color: "#9c27b0",
    isActive: (pathname) => pathname === "/dashboard/products/new",
  },
  {
    text: "Доставка и оплата",
    shortText: "Настройки",
    icon: <SettingsIcon />,
    href: "/dashboard/settings",
    color: "#607d8b",
    isActive: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
  {
    text: "Безопасность",
    shortText: "Защита",
    icon: <ShieldIcon />,
    href: "/dashboard/security",
    color: "#f57c00",
    isActive: (pathname) => pathname.startsWith("/dashboard/security"),
  },
];

const primaryNavigationItems = navigationItems.slice(0, 4);
const secondaryNavigationItems = navigationItems.slice(4);

const getIsActive = (item: NavigationItem, pathname: string) =>
  item.isActive?.(pathname) ?? pathname === item.href;

const NavigationIcon = ({ item }: { item: NavigationItem }) =>
  item.badge ? (
    <Badge badgeContent={item.badge} color="error">
      {item.icon}
    </Badge>
  ) : (
    item.icon
  );

export const DashboardNavigation: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isMoreOpen = Boolean(moreAnchorEl);
  const hasActiveSecondaryItem = secondaryNavigationItems.some((item) =>
    getIsActive(item, pathname),
  );

  const handleOpenMore = (event: React.MouseEvent<HTMLElement>) => {
    setMoreAnchorEl(event.currentTarget);
  };

  const handleCloseMore = () => {
    setMoreAnchorEl(null);
  };

  const handleMobileLogout = async () => {
    try {
      setIsLoggingOut(true);
      handleCloseMore();
      logout();
      queryClient.removeQueries();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          display: { xs: "none", md: "block" },
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
        }}
      >
        <List component="nav" sx={{ px: 1, pb: 1 }}>
          {navigationItems.map((item) => {
            const isActive = getIsActive(item, pathname);

            return (
              <ListItemButton
                key={item.text}
                component={Link}
                href={item.href}
                selected={isActive}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  py: 1.25,
                  transition: "all 0.2s ease-in-out",
                  "&.Mui-selected": {
                    backgroundColor: alpha(item.color, 0.12),
                    color: item.color,
                    "& .MuiListItemIcon-root": {
                      color: item.color,
                    },
                    "&:hover": {
                      backgroundColor: alpha(item.color, 0.2),
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 4,
                      height: "60%",
                      backgroundColor: item.color,
                      borderRadius: "0 4px 4px 0",
                    },
                  },
                  "&:hover": {
                    backgroundColor: alpha(item.color, 0.08),
                    transform: "translateX(4px)",
                    "& .MuiListItemIcon-root": {
                      color: item.color,
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 44 }}>
                  <NavigationIcon item={item} />
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.9375rem",
                  }}
                />
              </ListItemButton>
            );
          })}

          <Divider sx={{ my: 1.5 }} />
          <LogoutButton />
        </List>
      </Paper>

      <Paper
        component="nav"
        elevation={0}
        aria-label="Навигация личного кабинета"
        sx={{
          display: { xs: "block", md: "none" },
          position: "sticky",
          top: LAYOUT.HEADER_HEIGHT_PX,
          zIndex: theme.zIndex.appBar - 1,
          mx: { xs: -1.5, sm: 0 },
          px: { xs: 1, sm: 1.25 },
          py: 0.75,
          borderRadius: { xs: 0, sm: 2 },
          border: {
            xs: "none",
            sm: `1px solid ${theme.palette.divider}`,
          },
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(64px, 1fr))",
            gap: 0.5,
            minWidth: 344,
          }}
        >
          {primaryNavigationItems.map((item) => {
            const isActive = getIsActive(item, pathname);

            return (
              <ButtonBase
                key={item.text}
                component={Link}
                href={item.href}
                sx={{
                  minHeight: 56,
                  borderRadius: 1.5,
                  px: 0.5,
                  py: 0.75,
                  color: isActive ? item.color : "text.secondary",
                  bgcolor: isActive ? alpha(item.color, 0.1) : "transparent",
                  transition: theme.transitions.create(
                    ["background-color", "color"],
                    {
                      duration: theme.transitions.duration.shorter,
                    },
                  ),
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    minWidth: 0,
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.35,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      "& .MuiSvgIcon-root": {
                        fontSize: 22,
                      },
                    }}
                  >
                    <NavigationIcon item={item} />
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "0.68rem",
                      fontWeight: isActive ? 700 : 600,
                      lineHeight: 1.1,
                      textAlign: "center",
                    }}
                  >
                    {item.shortText}
                  </Box>
                </Box>
              </ButtonBase>
            );
          })}

          <ButtonBase
            aria-controls={isMoreOpen ? "dashboard-mobile-menu" : undefined}
            aria-haspopup="menu"
            aria-expanded={isMoreOpen ? "true" : undefined}
            onClick={handleOpenMore}
            sx={{
              minHeight: 56,
              borderRadius: 1.5,
              px: 0.5,
              py: 0.75,
              color: hasActiveSecondaryItem ? theme.palette.primary.main : "text.secondary",
              bgcolor: hasActiveSecondaryItem
                ? alpha(theme.palette.primary.main, 0.1)
                : "transparent",
            }}
          >
            <Box
              sx={{
                display: "flex",
                minWidth: 0,
                flexDirection: "column",
                alignItems: "center",
                gap: 0.35,
              }}
            >
              <MoreHorizIcon sx={{ fontSize: 22 }} />
              <Box
                component="span"
                sx={{
                  width: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "0.68rem",
                  fontWeight: hasActiveSecondaryItem ? 700 : 600,
                  lineHeight: 1.1,
                  textAlign: "center",
                }}
              >
                Еще
              </Box>
            </Box>
          </ButtonBase>
        </Box>
      </Paper>

      <Menu
        id="dashboard-mobile-menu"
        anchorEl={moreAnchorEl}
        open={isMoreOpen}
        onClose={handleCloseMore}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 246,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[6],
          },
        }}
      >
        {secondaryNavigationItems.map((item) => {
          const isActive = getIsActive(item, pathname);

          return (
            <MenuItem
              key={item.text}
              component={Link}
              href={item.href}
              selected={isActive}
              onClick={handleCloseMore}
              sx={{
                minHeight: 46,
                color: isActive ? item.color : "text.primary",
                bgcolor: isActive ? alpha(item.color, 0.1) : undefined,
                "&.Mui-selected": {
                  bgcolor: alpha(item.color, 0.12),
                },
                "&.Mui-selected:hover": {
                  bgcolor: alpha(item.color, 0.18),
                },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>
                <NavigationIcon item={item} />
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: isActive ? 700 : 600,
                }}
              />
            </MenuItem>
          );
        })}

        <Divider sx={{ my: 0.75 }} />
        <MenuItem
          onClick={handleMobileLogout}
          disabled={isLoggingOut}
          sx={{
            minHeight: 46,
            color: "error.main",
            fontWeight: 600,
          }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>
            {isLoggingOut ? (
              <CircularProgress size={20} color="error" />
            ) : (
              <LogoutIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={isLoggingOut ? "Выход..." : "Выйти"}
            primaryTypographyProps={{ fontWeight: 600 }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};

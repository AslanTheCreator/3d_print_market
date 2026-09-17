"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AddRounded,
  ChevronRightRounded,
  Inventory2Outlined,
  LogoutRounded,
  SettingsOutlined,
  ShieldOutlined,
  ShoppingBagOutlined,
  TrendingUpRounded,
} from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
} from "@mui/material";
import { useAuthStore } from "@/entities/session";
import { useNotification } from "@/shared/ui/notification";

const destinationGroups = [
  [
    { label: "Мои товары", href: "/dashboard/products", Icon: Inventory2Outlined },
    { label: "Покупки", href: "/dashboard/purchase", Icon: ShoppingBagOutlined },
    { label: "Продажи", href: "/dashboard/sales", Icon: TrendingUpRounded },
    { label: "Создать товар", href: "/dashboard/products/new", Icon: AddRounded },
  ],
  [
    {
      label: "Настройки",
      description: "Адреса, доставка, оплата и связь",
      href: "/dashboard/settings",
      Icon: SettingsOutlined,
    },
    { label: "Безопасность", href: "/dashboard/security", Icon: ShieldOutlined },
  ],
];

const rowSx = {
  minHeight: 56,
  px: 2,
  py: 1,
  gap: 1,
  "&.Mui-focusVisible": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: -2,
  },
} as const;

export const DashboardMobileNavigation = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const { showNotification } = useNotification();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    try {
      logout();
      queryClient.removeQueries();
      router.push("/auth/login");
    } catch {
      setIsLoggingOut(false);
      showNotification("Не удалось выйти. Попробуйте ещё раз.", "error");
    }
  };

  return (
    <Box
      component="nav"
      aria-label="Разделы личного кабинета"
      sx={{ display: { xs: "block", md: "none" } }}
    >
      <Stack spacing={1.5}>
        {destinationGroups.map((destinations, groupIndex) => (
          <Paper
            key={destinations[0].href}
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "hidden", boxShadow: "none" }}
          >
            <List disablePadding>
              {destinations.map(({ label, href, Icon, ...destination }, index) => (
                <Fragment key={href}>
                  {index > 0 && <Divider component="li" />}
                  <Box component="li">
                    <ListItemButton component={Link} href={href} sx={rowSx}>
                      <ListItemIcon sx={{ minWidth: 28, "& svg": { fontSize: 24 } }}>
                        <Icon />
                      </ListItemIcon>
                      <ListItemText
                        primary={label}
                        secondary={"description" in destination ? destination.description : undefined}
                        sx={{ my: 0, minWidth: 0 }}
                        primaryTypographyProps={{ fontSize: 16, fontWeight: 500 }}
                        secondaryTypographyProps={{ fontSize: 12, lineHeight: 1.5 }}
                      />
                      <ChevronRightRounded sx={{ color: "text.secondary", flexShrink: 0 }} />
                    </ListItemButton>
                  </Box>
                </Fragment>
              ))}
              {groupIndex === destinationGroups.length - 1 && (
                <>
                  <Divider component="li" />
                  <Box component="li">
                    <ListItemButton
                      component="button"
                      type="button"
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                      sx={{ ...rowSx, width: "100%", color: "error.main" }}
                    >
                      <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
                        {isLoggingOut ? <CircularProgress size={24} color="inherit" /> : <LogoutRounded />}
                      </ListItemIcon>
                      <ListItemText
                        primary={isLoggingOut ? "Выход..." : "Выйти"}
                        sx={{ my: 0 }}
                        primaryTypographyProps={{ fontSize: 16, fontWeight: 500 }}
                      />
                    </ListItemButton>
                  </Box>
                </>
              )}
            </List>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

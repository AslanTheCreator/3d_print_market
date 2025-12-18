"use client";

import React from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Badge,
  useTheme,
  alpha,
} from "@mui/material";
import {
  ShoppingBag as ShoppingBagIcon,
  AccessTime as AccessTimeIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/features/auth";

interface NavigationItem {
  text: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  color: string;
}

const navigationItems: NavigationItem[] = [
  {
    text: "Товары",
    icon: <InventoryIcon />,
    href: "/dashboard/products",
    color: "#f44336",
  },
  {
    text: "Покупки",
    icon: <ShoppingBagIcon />,
    href: "/dashboard/purchase",
    color: "#4caf50",
  },
  {
    text: "Продажи",
    icon: <TrendingUpIcon />,
    href: "/dashboard/sales",
    color: "#ff9800",
  },
  {
    text: "Создать товар",
    icon: <AccessTimeIcon />,
    href: "/dashboard/products/new",
    color: "#9c27b0",
  },
  {
    text: "Настройки",
    icon: <SettingsIcon />,
    href: "/dashboard/settings",
    color: "#607d8b",
  },
];

export const DashboardNavigation: React.FC = () => {
  const theme = useTheme();
  const pathname = usePathname();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
      }}
    >
      <List component="nav" sx={{ px: 1, pb: 1 }}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;

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
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
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
  );
};

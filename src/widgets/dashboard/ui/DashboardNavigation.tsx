import React from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Box,
  Badge,
  useTheme,
} from "@mui/material";
import {
  Person as PersonIcon,
  ShoppingBag as ShoppingBagIcon,
  AccessTime as AccessTimeIcon,
  Timeline as TimelineIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { LogoutButton } from "@/features/auth";

type DashboardSection = "main" | "profile" | "payment-methods";

interface NavigationItem {
  text: string;
  icon: React.ReactNode;
  action: "navigate" | "link";
  target: DashboardSection | string;
  badge?: number;
  color?: string;
}

interface DashboardNavigationProps {
  onNavigate: (section: DashboardSection) => void;
  activeSection: DashboardSection;
}

const navigationItems: NavigationItem[] = [
  {
    text: "Профиль",
    icon: <PersonIcon />,
    action: "navigate",
    target: "profile",
    color: "#2196f3",
  },
  {
    text: "Покупки",
    icon: <ShoppingBagIcon />,
    action: "link",
    target: "/dashboard/purchase",
    color: "#4caf50",
  },
  {
    text: "Продажи",
    icon: <TrendingUpIcon />,
    action: "link",
    target: "/dashboard/sales",
    color: "#ff9800",
  },
  {
    text: "Предзаказы",
    icon: <AccessTimeIcon />,
    action: "link",
    target: "/dashboard/pre-orders",
    color: "#9c27b0",
  },
  {
    text: "Товары",
    icon: <InventoryIcon />,
    action: "link",
    target: "/dashboard/products",
    color: "#f44336",
  },
];

export const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  onNavigate,
  activeSection,
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
    >
      <List component="nav" sx={{ p: 1 }}>
        {navigationItems.map((item, index) => (
          <React.Fragment key={item.text}>
            {item.action === "navigate" ? (
              <ListItemButton
                onClick={() => onNavigate(item.target as DashboardSection)}
                selected={activeSection === item.target}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  "&.Mui-selected": {
                    backgroundColor: `${item.color}15`,
                    color: item.color,
                    "& .MuiListItemIcon-root": {
                      color: item.color,
                    },
                    "&:hover": {
                      backgroundColor: `${item.color}25`,
                    },
                  },
                  "&:hover": {
                    backgroundColor: `${item.color}10`,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
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
                    fontWeight: activeSection === item.target ? 600 : 400,
                  }}
                />
              </ListItemButton>
            ) : (
              <ListItemButton
                component={Link}
                href={item.target}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  "&:hover": {
                    backgroundColor: `${item.color}10`,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            )}
          </React.Fragment>
        ))}

        <Divider sx={{ my: 1 }} />
        <LogoutButton />
      </List>
    </Paper>
  );
};

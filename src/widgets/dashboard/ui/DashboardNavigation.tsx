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
  Person as PersonIcon,
  ShoppingBag as ShoppingBagIcon,
  AccessTime as AccessTimeIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon,
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
    text: "Товары",
    icon: <InventoryIcon />,
    action: "link",
    target: "/dashboard/products",
    color: "#f44336",
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
    text: "Настройки",
    icon: <SettingsIcon />,
    action: "link",
    target: "/dashboard/settings",
    color: "#607d8b",
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
      sx={{
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
      }}
    >
      <List component="nav" sx={{ px: 1, pb: 1 }}>
        {navigationItems.map((item, index) => (
          <React.Fragment key={item.text}>
            {item.action === "navigate" ? (
              <ListItemButton
                onClick={() => onNavigate(item.target as DashboardSection)}
                selected={activeSection === item.target}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  py: 1.25,
                  transition: "all 0.2s ease-in-out",
                  "&.Mui-selected": {
                    backgroundColor: alpha(item.color!, 0.12),
                    color: item.color,
                    "& .MuiListItemIcon-root": {
                      color: item.color,
                    },
                    "&:hover": {
                      backgroundColor: alpha(item.color!, 0.2),
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
                    backgroundColor: alpha(item.color!, 0.08),
                    transform: "translateX(4px)",
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
                    fontWeight: activeSection === item.target ? 600 : 500,
                    fontSize: "0.9375rem",
                  }}
                />
              </ListItemButton>
            ) : (
              <ListItemButton
                component={Link}
                href={item.target}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  py: 1.25,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: alpha(item.color!, 0.08),
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
                    fontWeight: 500,
                    fontSize: "0.9375rem",
                  }}
                />
              </ListItemButton>
            )}
          </React.Fragment>
        ))}

        <Divider sx={{ my: 1.5 }} />
        <LogoutButton />
      </List>
    </Paper>
  );
};

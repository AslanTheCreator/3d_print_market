import React from "react";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
} from "@mui/material";
import {
  Person as PersonIcon,
  ShoppingBag as ShoppingBagIcon,
  AccessTime as AccessTimeIcon,
  Favorite as FavoriteIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { LogoutButton } from "@/features/auth";

type DashboardSection = "main" | "profile" | "payment-methods";

interface NavigationItem {
  text: string;
  icon: React.ReactNode;
  action: "navigate" | "link";
  target: DashboardSection | string;
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
  },
  {
    text: "Текущие заказы",
    icon: <ShoppingBagIcon />,
    action: "link",
    target: "/dashboard/current-orders",
  },
  {
    text: "Предзаказы",
    icon: <AccessTimeIcon />,
    action: "link",
    target: "/dashboard/pre-orders",
  },
  {
    text: "Товары",
    icon: <ShoppingBagIcon />,
    action: "link",
    target: "/dashboard/products",
  },
  {
    text: "Избранное",
    icon: <FavoriteIcon />,
    action: "link",
    target: "/dashboard/favorites",
  },
  {
    text: "История покупок",
    icon: <HistoryIcon />,
    action: "link",
    target: "/dashboard/order-history",
  },
];

export const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  onNavigate,
  activeSection,
}) => {
  //const router = useRouter();

  return (
    <Paper elevation={3} sx={{ borderRadius: 2 }}>
      <List component="nav" aria-label="dashboard navigation">
        {navigationItems.map((item, index) => (
          <React.Fragment key={item.text}>
            {item.action === "navigate" ? (
              // Элементы, которые переключают секции без изменения URL
              <ListItem
                onClick={() => onNavigate(item.target as DashboardSection)}
                selected={activeSection === item.target}
                sx={{
                  cursor: "pointer",
                  bgcolor:
                    activeSection === item.target
                      ? "rgba(0, 0, 0, 0.04)"
                      : "inherit",
                  "&:hover": { bgcolor: "rgba(0, 0, 0, 0.08)" },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ) : (
              // Обычные ссылки для перехода на другие страницы
              <ListItem component={Link as any} href={item.target}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            )}
            {index < navigationItems.length - 1 && <Divider />}
          </React.Fragment>
        ))}
        <Divider />
        <LogoutButton />
      </List>
    </Paper>
  );
};

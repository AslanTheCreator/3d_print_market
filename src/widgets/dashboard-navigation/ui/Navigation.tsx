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
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/features/auth";

interface NavigationItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

const navigationItems: NavigationItem[] = [
  { text: "Профиль", icon: <PersonIcon />, path: "/dashboard/profile" },
  {
    text: "Текущие заказы",
    icon: <ShoppingBagIcon />,
    path: "/dashboard/current-orders",
  },
  {
    text: "Предзаказы",
    icon: <AccessTimeIcon />,
    path: "/dashboard/pre-orders",
  },
  { text: "Избранное", icon: <FavoriteIcon />, path: "/dashboard/favorites" },
  {
    text: "История покупок",
    icon: <HistoryIcon />,
    path: "/dashboard/order-history",
  },
];

export const DashboardNavigation: React.FC = () => {
  //const router = useRouter();

  return (
    <Paper elevation={3} sx={{ borderRadius: 2 }}>
      <List component="nav" aria-label="dashboard navigation">
        {navigationItems.map((item, index) => (
          <React.Fragment key={item.text}>
            <ListItem component={Link} href={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
            {index < navigationItems.length - 1 && <Divider />}
          </React.Fragment>
        ))}
        <Divider />
        <LogoutButton />
      </List>
    </Paper>
  );
};

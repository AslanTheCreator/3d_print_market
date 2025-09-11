import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Avatar,
  Chip,
  Divider,
  Stack,
  IconButton,
} from "@mui/material";
import {
  ShoppingBag,
  TrendingUp,
  Star,
  ArrowForward,
  Timeline,
  Receipt,
  Inventory,
} from "@mui/icons-material";
import { UserProfileModel } from "@/entities/user";
import Link from "next/link";

interface DashboardContentProps {
  user: UserProfileModel;
}

// Статистические карточки
const StatCard = ({
  title,
  value,
  icon,
  color,
  link,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  link?: string;
}) => (
  <Card
    sx={{
      height: "100%",
      position: "relative",
      overflow: "visible",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: 3,
      },
      transition: "all 0.3s ease-in-out",
      cursor: link ? "pointer" : "default",
    }}
    component={link ? Link : "div"}
    href={link || ""}
  >
    <CardContent sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography color="text.secondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            backgroundColor: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
      {link && (
        <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
          <Typography variant="body2" color="primary">
            Подробнее
          </Typography>
          <ArrowForward sx={{ ml: 1, fontSize: 16 }} />
        </Box>
      )}
    </CardContent>
  </Card>
);

// Быстрые действия
const QuickAction = ({
  title,
  description,
  icon,
  link,
  color = "primary",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  color?: "primary" | "secondary" | "success" | "warning";
}) => (
  <Card
    sx={{
      height: "100%",
      cursor: "pointer",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: 2,
      },
      transition: "all 0.2s ease-in-out",
    }}
    component={Link}
    href={link}
  >
    <CardContent sx={{ p: 3, textAlign: "center" }}>
      <Avatar
        sx={{
          width: 56,
          height: 56,
          mx: "auto",
          mb: 2,
          bgcolor: `${color}.main`,
        }}
      >
        {icon}
      </Avatar>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </CardContent>
  </Card>
);

export const DashboardContent: React.FC<DashboardContentProps> = ({ user }) => {
  const displayName = user.fullName?.trim() ? user.fullName : user.login;

  return (
    <Box>
      {/* Заголовок */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          Добро пожаловать, {displayName}!
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Управляйте вашими заказами и настройками через личный кабинет
        </Typography>
      </Box>

      {/* Статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Покупки"
            value="0"
            icon={<ShoppingBag />}
            color="#2196f3"
            link="/dashboard/purchase"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Продажи"
            value="0"
            icon={<TrendingUp />}
            color="#4caf50"
            link="/dashboard/sales"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Предзаказы"
            value="0"
            icon={<Timeline />}
            color="#ff9800"
            link="/dashboard/pre-orders"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Товары"
            value="0"
            icon={<Inventory />}
            color="#9c27b0"
            link="/dashboard/products"
          />
        </Grid>
      </Grid>

      {/* Быстрые действия */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Быстрые действия
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <QuickAction
            title="Мои покупки"
            description="Просмотр истории заказов и их статусов"
            icon={<Receipt />}
            link="/dashboard/purchase"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <QuickAction
            title="Мои продажи"
            description="Управление продажами и заказами"
            icon={<TrendingUp />}
            link="/dashboard/sales"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <QuickAction
            title="Мои товары"
            description="Добавление и редактирование товаров"
            icon={<Inventory />}
            link="/dashboard/products"
            color="secondary"
          />
        </Grid>
      </Grid>

      {/* Последние активности */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Последние активности
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ textAlign: "center", py: 6 }}>
            <Timeline sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Нет активности
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Ваши последние действия будут отображаться здесь
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

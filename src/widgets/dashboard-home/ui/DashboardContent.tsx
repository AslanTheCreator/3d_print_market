import React from "react";
import Link from "next/link";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import {
  FavoriteRounded,
  ShoppingBagRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import { useFavoritesProducts } from "@/entities/favorite";
import { UserBaseModel } from "@/entities/user";

interface DashboardContentProps {
  user: UserBaseModel;
}

interface DashboardShortcutCardProps {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}

const getProductWord = (count: number) => {
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return "товаров";
  }

  const lastDigit = count % 10;

  if (lastDigit === 1) {
    return "товар";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "товара";
  }

  return "товаров";
};

const DashboardShortcutCard = ({
  title,
  subtitle,
  href,
  icon,
}: DashboardShortcutCardProps) => {
  const theme = useTheme();

  return (
    <Card
      component={Link}
      href={href}
      sx={{
        display: "block",
        width: "100%",
        height: "100%",
        borderRadius: 3,
        backgroundColor: theme.palette.common.white,
        border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
        textDecoration: "none",
        transition:
          "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: alpha(theme.palette.primary.main, 0.18),
          boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2.5, sm: 3 },
          minHeight: 112,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            component="h2"
            sx={{
              mb: 0.5,
              fontWeight: 700,
              color: "text.primary",
              fontSize: { xs: "1rem", sm: "1.125rem" },
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              fontSize: { xs: "0.95rem", sm: "1rem" },
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        <Box
          sx={{
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            "& .MuiSvgIcon-root": {
              fontSize: 34,
            },
          }}
        >
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
};

export const DashboardContent: React.FC<DashboardContentProps> = ({ user }) => {
  const theme = useTheme();
  const displayName = user.fullName?.trim() ? user.fullName : user.login;
  const { data: favorites = [], isLoading: isFavoritesLoading } =
    useFavoritesProducts();

  const favoriteSubtitle = isFavoritesLoading
    ? "Загрузка..."
    : `${favorites.length} ${getProductWord(favorites.length)}`;

  const cards = [
    {
      title: "Избранное",
      subtitle: favoriteSubtitle,
      href: "/favorites",
      icon: <FavoriteRounded />,
    },
    {
      title: "Покупки",
      subtitle: "Смотреть",
      href: "/dashboard/purchase",
      icon: <ShoppingBagRounded />,
    },
    {
      title: "Продажи",
      subtitle: "Смотреть",
      href: "/dashboard/sales",
      icon: <TrendingUpRounded />,
    },
  ];

  return (
    <Box>
      <Card
        sx={{
          mb: 2,
          borderRadius: 3,
          backgroundColor: theme.palette.common.white,
          border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
            }}
          >
            Добро пожаловать, {displayName}!
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 0.75,
              color: "text.secondary",
              fontSize: { xs: "0.95rem", sm: "1rem" },
              lineHeight: 1.4,
            }}
          >
            Управляйте избранным, покупками и продажами в одном месте.
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid item key={card.title} xs={12} md={4}>
            <DashboardShortcutCard {...card} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

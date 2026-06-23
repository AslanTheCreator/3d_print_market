import React from "react";
import { Box, Grid, useTheme } from "@mui/material";
import {
  DashboardRounded,
  FavoriteRounded,
  ShoppingBagRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import { useFavoritesProducts } from "@/entities/favorite";
import { UserBaseModel } from "@/entities/user";
import { PageHeader } from "@/shared/ui/page-header";
import { DashboardShortcutCard } from "./dashboard-content/DashboardShortcutCard";
import { ProfileOverview } from "./dashboard-content/ProfileOverview";
import { getProductWord } from "./dashboard-content/model";

interface DashboardContentProps {
  user: UserBaseModel;
  onEditProfile: () => void;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
  user,
  onEditProfile,
}) => {
  const theme = useTheme();
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
      color: theme.palette.primary.main,
    },
    {
      title: "Покупки",
      subtitle: "Смотреть",
      href: "/dashboard/purchase",
      icon: <ShoppingBagRounded />,
      color: theme.palette.info.main,
    },
    {
      title: "Продажи",
      subtitle: "Смотреть",
      href: "/dashboard/sales",
      icon: <TrendingUpRounded />,
      color: theme.palette.success.main,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <PageHeader title="Обзор" icon={<DashboardRounded />} />
      </Box>

      <ProfileOverview user={user} onEditProfile={onEditProfile} />

      <Grid container spacing={{ xs: 1, sm: 2 }}>
        {cards.map((card) => (
          <Grid item key={card.title} xs={6} sm={4} md={4}>
            <DashboardShortcutCard {...card} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

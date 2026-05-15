import React from "react";
import Link from "next/link";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import {
  CameraAltRounded,
  CheckCircleRounded,
  DashboardRounded,
  FavoriteRounded,
  PersonRounded,
  ShoppingBagRounded,
  StarRounded,
  TrendingUpRounded,
  WarningAmberRounded,
} from "@mui/icons-material";
import { useFavoritesProducts } from "@/entities/favorite";
import { UserBaseModel } from "@/entities/user";
import { getImageUrl } from "@/shared/lib";
import { PageHeader } from "@/shared/ui/page-header";

interface DashboardContentProps {
  user: UserBaseModel;
  onEditProfile: () => void;
}

interface DashboardShortcutCardProps {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}

interface ProfileTask {
  label: string;
  completed: boolean;
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

const getProfileTasks = (user: UserBaseModel): ProfileTask[] => [
  {
    label: "Добавьте фото профиля",
    completed: Boolean(user.imageId || user.image?.length),
  },
  {
    label: "Заполните имя профиля",
    completed: Boolean(user.fullName?.trim() || user.login?.trim()),
  },
  {
    label: "Укажите контактный телефон",
    completed: Boolean(user.phoneNumber?.trim()),
  },
  {
    label: "Добавьте способ оплаты",
    completed: user.accounts.length > 0,
  },
];

const getProfileCompletion = (tasks: readonly ProfileTask[]) => {
  const completedTasks = tasks.filter((task) => task.completed).length;

  return Math.round((completedTasks / tasks.length) * 100);
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

interface ProfileOverviewProps {
  user: UserBaseModel;
  onEditProfile: () => void;
}

const ProfileOverview = ({ user, onEditProfile }: ProfileOverviewProps) => {
  const theme = useTheme();
  const userName = user.login || user.fullName;
  const userImage = user.image?.[0];
  const userImageSrc = getImageUrl(userImage, "medium");
  const tasks = getProfileTasks(user);
  const completion = getProfileCompletion(tasks);
  const rating = Number.isFinite(user.averageRating)
    ? user.averageRating.toFixed(1)
    : "0.0";

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 2,
        backgroundColor: theme.palette.common.white,
        border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={{ xs: 3, lg: 4 }}
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: "none", lg: "block" } }}
            />
          }
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2.5}
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ flex: "1 1 42%", minWidth: 0 }}
          >
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                src={userImageSrc}
                alt={userName}
                sx={{
                  width: { xs: 96, sm: 118 },
                  height: { xs: 96, sm: 118 },
                  border: "3px solid",
                  borderColor: "background.paper",
                  boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.12)",
                  bgcolor: "primary.light",
                }}
              >
                {!userImageSrc && <PersonRounded sx={{ fontSize: 48 }} />}
              </Avatar>

              <IconButton
                aria-label="Редактировать профиль"
                onClick={onEditProfile}
                sx={{
                  position: "absolute",
                  right: -6,
                  bottom: -6,
                  width: 42,
                  height: 42,
                  bgcolor: "background.paper",
                  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.18)",
                  "&:hover": {
                    bgcolor: "background.paper",
                  },
                }}
              >
                <CameraAltRounded fontSize="small" />
              </IconButton>
            </Box>

            <Box minWidth={0}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.15,
                  mb: 1,
                  fontSize: { xs: "1.6rem", sm: "2rem" },
                }}
              >
                {userName}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                Профиль Figurzilla
              </Typography>

              <Stack direction="row" spacing={1.25} alignItems="center">
                <StarRounded sx={{ color: "#FFB300", fontSize: 22 }} />
                <Typography variant="subtitle1" fontWeight={800}>
                  {rating}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.totalReviews} отзывов
                </Typography>
              </Stack>
            </Box>
          </Stack>

          <Box sx={{ flex: "1 1 32%", minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Заполненность профиля
              </Typography>
              <Typography variant="body2" fontWeight={800} color="primary.main">
                {completion}%
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={completion}
              sx={{
                height: 7,
                borderRadius: 999,
                mb: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
              }}
            />

            <Stack spacing={1}>
              {tasks.map((task) => (
                <Stack
                  key={task.label}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  {task.completed ? (
                    <CheckCircleRounded
                      sx={{ color: "success.main", fontSize: 20 }}
                    />
                  ) : (
                    <WarningAmberRounded
                      sx={{ color: "warning.main", fontSize: 20 }}
                    />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {task.label}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Stack
            spacing={2.5}
            sx={{
              flex: "0 0 260px",
              minWidth: 0,
              justifyContent: "space-between",
            }}
          >
            <Button
              variant="contained"
              onClick={onEditProfile}
              sx={{
                minHeight: 46,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 800,
              }}
            >
              Редактировать профиль
            </Button>

            <Divider />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Отзывов
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {user.totalReviews}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Рейтинг
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {rating}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const DashboardContent: React.FC<DashboardContentProps> = ({
  user,
  onEditProfile,
}) => {
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
      <PageHeader
        title="Обзор"
        subtitle="Профиль, быстрые разделы и готовность аккаунта."
        icon={<DashboardRounded />}
      />

      <ProfileOverview user={user} onEditProfile={onEditProfile} />

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

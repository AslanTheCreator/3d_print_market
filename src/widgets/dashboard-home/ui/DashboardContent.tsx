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
  ChevronRightRounded,
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
  color: string;
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
  color,
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
        borderRadius: 2,
        backgroundColor: theme.palette.common.white,
        border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
        textDecoration: "none",
        transition:
          "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: alpha(color, 0.28),
          boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          minHeight: { xs: 136, sm: 148, md: 132 },
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: { xs: 44, sm: 48 },
            height: { xs: 44, sm: 48 },
            borderRadius: 2,
            bgcolor: alpha(color, 0.12),
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            "& .MuiSvgIcon-root": {
              fontSize: { xs: 26, sm: 28 },
            },
          }}
        >
          {icon}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box minWidth={0}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                mb: 0.25,
                fontWeight: 800,
                color: "text.primary",
                fontSize: { xs: "0.98rem", sm: "1.05rem", md: "1.25rem" },
                lineHeight: 1.15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.76rem", sm: "0.85rem", md: "0.95rem" },
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </Typography>
          </Box>

          <ChevronRightRounded
            sx={{
              color: "text.secondary",
              fontSize: 24,
              flexShrink: 0,
            }}
          />
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
        mb: { xs: 1.25, sm: 2 },
        borderRadius: 2,
        backgroundColor: theme.palette.common.white,
        border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={{ xs: 1.5, sm: 3, lg: 4 }}
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: "none", lg: "block" } }}
            />
          }
        >
          <Stack
            direction="row"
            spacing={{ xs: 1.25, sm: 2.5 }}
            alignItems="center"
            sx={{ flex: "1 1 42%", minWidth: 0 }}
          >
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                src={userImageSrc}
                alt={userName}
                sx={{
                  width: { xs: 60, sm: 118 },
                  height: { xs: 60, sm: 118 },
                  border: { xs: "2px solid", sm: "3px solid" },
                  borderColor: "background.paper",
                  boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.12)",
                  bgcolor: "primary.light",
                }}
              >
                {!userImageSrc && (
                  <PersonRounded sx={{ fontSize: { xs: 30, sm: 48 } }} />
                )}
              </Avatar>

              <IconButton
                aria-label="Редактировать профиль"
                onClick={onEditProfile}
                sx={{
                  position: "absolute",
                  right: { xs: -4, sm: -6 },
                  bottom: { xs: -4, sm: -6 },
                  width: { xs: 32, sm: 42 },
                  height: { xs: 32, sm: 42 },
                  bgcolor: "background.paper",
                  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.18)",
                  "&:hover": {
                    bgcolor: "background.paper",
                  },
                }}
              >
                <CameraAltRounded sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
            </Box>

            <Box minWidth={0}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.15,
                  mb: { xs: 0.5, sm: 1 },
                  fontSize: { xs: "1.15rem", sm: "2rem" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-word",
                }}
              >
                {userName}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1.5,
                  display: { xs: "none", sm: "block" },
                }}
              >
                Профиль Figurzilla
              </Typography>

              <Stack
                direction="row"
                spacing={{ xs: 0.75, sm: 1.25 }}
                alignItems="center"
                sx={{ minWidth: 0 }}
              >
                <StarRounded
                  sx={{ color: "#FFB300", fontSize: { xs: 18, sm: 22 } }}
                />
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  {rating}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.totalReviews} отзывов
                </Typography>
              </Stack>
            </Box>
          </Stack>

          <Box
            sx={{
              flex: "1 1 32%",
              minWidth: 0,
              p: { xs: 1.25, sm: 0 },
              borderRadius: { xs: 1.5, sm: 0 },
              bgcolor: {
                xs: alpha(theme.palette.primary.main, 0.05),
                sm: "transparent",
              },
              border: {
                xs: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                sm: "none",
              },
            }}
          >
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
                height: { xs: 6, sm: 7 },
                borderRadius: 999,
                mb: { xs: 1.25, sm: 2 },
                bgcolor: alpha(theme.palette.primary.main, 0.12),
              }}
            />

            <Stack spacing={{ xs: 0.75, sm: 1 }}>
              {tasks.map((task) => (
                <Stack
                  key={task.label}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  {task.completed ? (
                    <CheckCircleRounded
                      sx={{ color: "success.main", fontSize: { xs: 18, sm: 20 } }}
                    />
                  ) : (
                    <WarningAmberRounded
                      sx={{ color: "warning.main", fontSize: { xs: 18, sm: 20 } }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.76rem", sm: "0.875rem" } }}
                  >
                    {task.label}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Stack
            spacing={{ xs: 1.25, sm: 2.5 }}
            sx={{
              flex: { xs: "0 1 auto", lg: "0 0 260px" },
              minWidth: 0,
              justifyContent: { xs: "flex-start", lg: "center" },
            }}
          >
            <Button
              variant="contained"
              onClick={onEditProfile}
              sx={{
                minHeight: { xs: 40, sm: 46 },
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 800,
                width: "100%",
              }}
            >
              Редактировать профиль
            </Button>
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
        <PageHeader
          title="Обзор"
          icon={<DashboardRounded />}
        />
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

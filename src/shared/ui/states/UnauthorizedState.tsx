import React from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
  Button,
} from "@mui/material";
import { useRouter } from "next/navigation";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";

type UnauthorizedStateType = "cart" | "favorites" | "checkout" | "adult";

const fallbackRedirectPaths: Record<UnauthorizedStateType, string> = {
  cart: "/checkout",
  favorites: "/favorites",
  checkout: "/checkout",
  adult: "/",
};

const configs: Record<
  UnauthorizedStateType,
  {
    description: string;
    caption: string;
  }
> = {
  cart: {
    description:
      "Чтобы добавлять товары в корзину и оформлять заказы, необходимо войти в свой аккаунт или зарегистрироваться.",
    caption:
      "У вас уже есть товары в корзине? После входа в аккаунт они автоматически восстановятся.",
  },
  favorites: {
    description:
      "Чтобы добавлять товары в избранное и оформлять заказы, необходимо войти в свой аккаунт или зарегистрироваться.",
    caption:
      "У вас уже есть товары в избранное? После входа в аккаунт они автоматически восстановятся.",
  },
  checkout: {
    description:
      "Чтобы оформить заказ, необходимо войти в свой аккаунт или зарегистрироваться.",
    caption:
      "У вас уже есть товары в корзине? После входа в аккаунт они автоматически восстановятся.",
  },
  adult: {
    description:
      "Чтобы просматривать разделы 18+, необходимо войти в аккаунт. Возраст проверяется по данным профиля.",
    caption:
      "Если вам уже есть 18 лет, войдите или зарегистрируйтесь с корректным возрастом.",
  },
};

export const UnauthorizedState = ({
  type,
}: {
  type: UnauthorizedStateType;
}) => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const config = configs[type];
  const getAuthPath = (authPath: "/auth/login" | "/auth/register") => {
    const redirectPath =
      typeof window === "undefined"
        ? fallbackRedirectPaths[type]
        : `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({ redirect: redirectPath });

    return `${authPath}?${params.toString()}`;
  };

  return (
    <Container
      data-testid={`unauthorized-state-${type}`}
      sx={{ marginTop: "10px" }}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        textAlign="center"
        gap={3}
      >
        <LockOutlinedIcon
          sx={{
            fontSize: isMobile ? 64 : 80,
            color: "primary.main",
            opacity: 0.7,
          }}
        />

        <Stack spacing={2} alignItems="center">
          <Typography
            variant={isMobile ? "h6" : "h5"}
            fontWeight={700}
            color="text.primary"
          >
            Войдите в аккаунт
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 400 }}
          >
            {config.description}
          </Typography>
        </Stack>

        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          sx={{ width: isMobile ? "100%" : "auto" }}
        >
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={() => router.push(getAuthPath("/auth/login"))}
            size={isMobile ? "medium" : "large"}
            sx={{ minWidth: isMobile ? "100%" : 140, textTransform: "none" }}
          >
            Войти
          </Button>

          <Button
            variant="outlined"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={() => router.push(getAuthPath("/auth/register"))}
            size={isMobile ? "medium" : "large"}
            sx={{ minWidth: isMobile ? "100%" : 140, textTransform: "none" }}
          >
            Регистрация
          </Button>
        </Stack>

        <Typography variant="caption" color="text.disabled">
          {config.caption}
        </Typography>
      </Box>
    </Container>
  );
};

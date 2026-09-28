import React from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
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
    title: string;
    description: string;
    caption: string;
  }
> = {
  cart: {
    title: "Корзина",
    description:
      "Войдите, чтобы увидеть свою корзину и оформить заказ.",
    caption:
      "После входа будут доступны товары, сохранённые в вашем аккаунте.",
  },
  favorites: {
    title: "Избранное",
    description:
      "Войдите, чтобы сохранять понравившиеся товары и возвращаться к ним позже.",
    caption:
      "После входа будут доступны товары, сохранённые в вашем аккаунте.",
  },
  checkout: {
    title: "Корзина",
    description:
      "Войдите, чтобы увидеть свою корзину и оформить заказ.",
    caption:
      "После входа будут доступны товары, сохранённые в вашем аккаунте.",
  },
  adult: {
    title: "Войдите в аккаунт",
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

  const config = configs[type];
  const isShoppingState = type !== "adult";
  const ShoppingIcon = type === "favorites" ? FavoriteBorderOutlinedIcon : ShoppingCartOutlinedIcon;
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
      sx={isShoppingState
        ? { mt: { xs: 0, md: "10px" }, pt: { xs: 3, sm: 4, md: 0 }, pb: { xs: 3, md: 0 } }
        : { marginTop: "10px" }}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        textAlign="center"
        gap={3}
        sx={isShoppingState ? {
          minHeight: { xs: "auto", md: 400 },
          maxWidth: { xs: 440, md: "none" },
          mx: "auto",
          gap: { xs: 2, md: 3 },
          "@media (max-width: 899.95px) and (max-height: 600px)": { gap: 1.5 },
        } : undefined}
      >
        {isShoppingState && (
          <ShoppingIcon sx={{ display: { xs: "block", md: "none" }, fontSize: 48, color: "primary.main", opacity: 0.7 }} />
        )}
        <LockOutlinedIcon
          sx={{
            display: isShoppingState ? { xs: "none", md: "block" } : undefined,
            fontSize: { xs: 64, sm: 80 },
            color: "primary.main",
            opacity: 0.7,
          }}
        />

        <Stack spacing={isShoppingState ? { xs: 1, md: 2 } : 2} alignItems="center">
          <Typography
            variant="h5"
            component={isShoppingState ? "h1" : "h2"}
            fontWeight={700}
            color="text.primary"
            sx={{ fontSize: isShoppingState ? { xs: "1.5rem", md: "1.125rem" } : { xs: "1rem", sm: "1.125rem" } }}
          >
            {config.title}
          </Typography>

          <Typography
            variant="body2"
            color={isShoppingState ? "grey.700" : "text.secondary"}
            sx={{ maxWidth: 400, ...(isShoppingState && { fontSize: { xs: "0.9375rem", md: "0.875rem" } }) }}
          >
            {config.description}
          </Typography>
        </Stack>

        <Stack
          direction={isShoppingState ? { xs: "column", md: "row" } : { xs: "column", sm: "row" }}
          spacing={isShoppingState ? { xs: 1.5, md: 2 } : 2}
          sx={{ width: isShoppingState ? { xs: "100%", md: "auto" } : { xs: "100%", sm: "auto" } }}
        >
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={() => router.push(getAuthPath("/auth/login"))}
            size="large"
            sx={{
              minWidth: isShoppingState ? { xs: "100%", md: 140 } : { xs: "100%", sm: 140 },
              ...(isShoppingState && { minHeight: { xs: 48, md: 44 } }),
              py: { xs: 1, sm: 1.25 },
              textTransform: "none",
            }}
          >
            Войти
          </Button>

          <Button
            variant="outlined"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={() => router.push(getAuthPath("/auth/register"))}
            size="large"
            sx={{
              minWidth: isShoppingState ? { xs: "100%", md: 140 } : { xs: "100%", sm: 140 },
              ...(isShoppingState && { minHeight: { xs: 48, md: 44 } }),
              py: { xs: 1, sm: 1.25 },
              textTransform: "none",
            }}
          >
            {isShoppingState ? "Создать аккаунт" : "Регистрация"}
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={isShoppingState ? {
          maxWidth: { xs: 360, md: "none" },
          fontSize: { xs: "0.875rem", md: "0.75rem" },
        } : undefined}>
          {config.caption}
        </Typography>
        {isShoppingState && (
          <Button
            component={Link}
            href="/catalog/search"
            variant="text"
            sx={{ display: { xs: "inline-flex", md: "none" }, minHeight: 44, color: "text.primary" }}
          >
            Перейти в каталог
          </Button>
        )}
      </Box>
    </Container>
  );
};

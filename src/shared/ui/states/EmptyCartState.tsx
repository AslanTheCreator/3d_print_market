"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { useRouter } from "next/navigation";
import {
  ShoppingCartOutlined,
  StorefrontOutlined,
  FavoriteBorderOutlined,
} from "@mui/icons-material";

export const EmptyCartState: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Иконка с декоративным фоном */}
        <Box
          sx={{
            width: isMobile ? 100 : 120,
            height: isMobile ? 100 : 120,
            borderRadius: "50%",
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
            position: "relative",
          }}
        >
          <ShoppingCartOutlined
            sx={{
              fontSize: isMobile ? 48 : 56,
              color: alpha(theme.palette.primary.main, 0.6),
            }}
          />
        </Box>

        {/* Текст */}
        <Stack spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            fontWeight={700}
            color="text.primary"
          >
            Корзина пуста
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 360, lineHeight: 1.6 }}
          >
            Добавьте товары, которые вам понравились, и возвращайтесь сюда для
            оформления заказа.
          </Typography>
        </Stack>

        {/* Кнопки */}
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          sx={{ width: isMobile ? "100%" : "auto", mb: 5 }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<StorefrontOutlined />}
            onClick={() => router.push("/")}
            sx={{
              minWidth: isMobile ? "100%" : 200,
              textTransform: "none",
              py: 1.5,
            }}
          >
            Перейти в каталог
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={<FavoriteBorderOutlined />}
            onClick={() => router.push("/favorites")}
            sx={{
              minWidth: isMobile ? "100%" : 200,
              textTransform: "none",
              py: 1.5,
            }}
          >
            Избранное
          </Button>
        </Stack>

        {/* Подсказки */}
        <Box
          sx={{
            width: "100%",
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            borderRadius: 3,
            p: { xs: 2.5, sm: 3 },
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1.5, fontWeight: 600 }}
          >
            Не знаете с чего начать?
          </Typography>
          <Stack spacing={1}>
            {[
              "Просмотрите каталог и добавьте товары в корзину",
              "Загляните в избранное — возможно, там уже что-то ждёт",
              "Используйте поиск для быстрого нахождения нужного товара",
            ].map((tip, index) => (
              <Typography
                key={index}
                variant="caption"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    bgcolor: theme.palette.primary.main,
                    flexShrink: 0,
                  }}
                />
                {tip}
              </Typography>
            ))}
          </Stack>
        </Box>
      </Box>
    </Container>
  );
};

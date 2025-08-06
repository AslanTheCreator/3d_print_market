"use client";

import React from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Stack,
  Divider,
  useTheme,
} from "@mui/material";
import {
  CheckCircle,
  ShoppingBag,
  Home,
  AccountBox,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

const CheckoutSuccess = () => {
  const router = useRouter();
  const theme = useTheme();

  const handleContinueShopping = () => {
    router.push("/");
  };

  const handleViewOrders = () => {
    router.push("/dashboard/purchase");
  };

  const handleGoToProfile = () => {
    router.push("/dashboard");
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        my: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* Основная карточка с поздравлением */}
      <Paper
        sx={{
          p: { xs: 3, sm: 4 },
          textAlign: "center",
          mb: { xs: 2, sm: 3 },
          background: `linear-gradient(135deg, ${theme.palette.primary.light}15, ${theme.palette.secondary.light}15)`,
          border: `1px solid ${theme.palette.primary.light}30`,
        }}
      >
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <CheckCircle
            sx={{
              fontSize: { xs: 60, sm: 80 },
              color: theme.palette.success.main,
              mb: { xs: 1.5, sm: 2 },
            }}
          />
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 1,
              fontSize: { xs: "1.5rem", sm: "2rem" },
            }}
          >
            Заказ оформлен!
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              mb: { xs: 2, sm: 3 },
              fontWeight: 500,
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Спасибо за покупку в нашем маркетплейсе
          </Typography>
        </Box>

        <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
          >
            Мы отправили детали заказа на вашу электронную почту
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
          >
            Продавцы свяжутся с вами для уточнения деталей доставки
          </Typography>
        </Stack>

        <Divider sx={{ my: { xs: 2, sm: 3 } }} />

        {/* Информационные блоки */}
        <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ textAlign: "left" }}>
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              backgroundColor: theme.palette.background.paper,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography
              variant="subtitle2"
              color="primary.main"
              gutterBottom
              sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
            >
              Что дальше?
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                lineHeight: { xs: 1.4, sm: 1.43 },
              }}
            >
              • Отслеживайте статус заказов в личном кабинете
              <br />
              • Ожидайте звонка от продавцов для подтверждения
              <br />• Подготовьте документы для получения товаров
            </Typography>
          </Box>

          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              backgroundColor: theme.palette.info.main + "10",
              borderRadius: 2,
              border: `1px solid ${theme.palette.info.light}50`,
            }}
          >
            <Typography
              variant="subtitle2"
              color="info.main"
              gutterBottom
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
              }}
            >
              💡 Полезно знать
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                lineHeight: { xs: 1.4, sm: 1.43 },
              }}
            >
              Номер заказа и детали доставки сохранены в вашем профиле. Вы
              можете изменить способ получения до подтверждения продавцом.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Кнопки действий */}
      <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 3, sm: 4 } }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<ShoppingBag />}
          onClick={handleContinueShopping}
          sx={{
            py: { xs: 1.2, sm: 1.5 },
            fontSize: { xs: "0.9rem", sm: "1rem" },
            fontWeight: 600,
          }}
        >
          Продолжить покупки
        </Button>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1.5, sm: 2 }}
        >
          <Button
            variant="outlined"
            size="large"
            startIcon={<AccountBox />}
            onClick={handleViewOrders}
            sx={{
              flex: { sm: 1 },
              py: { xs: 1, sm: 1.2 },
              fontWeight: 600,
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            }}
          >
            Мои заказы
          </Button>

          <Button
            variant="text"
            size="large"
            startIcon={<Home />}
            onClick={handleGoToProfile}
            sx={{
              flex: { sm: 1 },
              py: { xs: 1, sm: 1.2 },
              fontWeight: 600,
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
            }}
          >
            Профиль
          </Button>
        </Stack>
      </Stack>

      {/* Дополнительная информация */}
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{
            fontWeight: 600,
            mb: { xs: 1.5, sm: 2 },
            fontSize: { xs: "1rem", sm: "1.125rem" },
          }}
        >
          Нужна помощь?
        </Typography>

        <Stack spacing={{ xs: 1, sm: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 1,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                minWidth: { sm: "120px" },
              }}
            >
              📞 Горячая линия:
            </Typography>
            <Typography
              variant="body2"
              color="primary.main"
              sx={{
                fontWeight: 500,
                fontSize: { xs: "0.85rem", sm: "0.875rem" },
              }}
            >
              8 (800) 555-01-23
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 1,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                minWidth: { sm: "120px" },
              }}
            >
              ✉️ Поддержка:
            </Typography>
            <Typography
              variant="body2"
              color="primary.main"
              sx={{
                fontWeight: 500,
                fontSize: { xs: "0.85rem", sm: "0.875rem" },
                wordBreak: "break-word",
              }}
            >
              support@marketplace.ru
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 1,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                minWidth: { sm: "120px" },
              }}
            >
              🕒 Время работы:
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
            >
              Пн-Пт 9:00-21:00, Сб-Вс 10:00-18:00
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            textAlign: "center",
            display: "block",
            fontSize: { xs: "0.7rem", sm: "0.75rem" },
            lineHeight: 1.4,
          }}
        >
          Спасибо, что выбираете нас! Мы работаем для вашего удобства 24/7
        </Typography>
      </Paper>
    </Container>
  );
};

export default CheckoutSuccess;

"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
  Fade,
  Grow,
} from "@mui/material";
import {
  CheckCircleOutline,
  Receipt,
  Home,
  LocalShipping,
} from "@mui/icons-material";

interface OrderSuccessStateProps {
  orderCount?: number;
  onGoToOrders: () => void;
  onGoHome: () => void;
}

export const OrderSuccessState: React.FC<OrderSuccessStateProps> = ({
  orderCount = 1,
  onGoToOrders,
  onGoHome,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
      <Fade in timeout={600}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Анимированная иконка успеха */}
          <Grow in timeout={800}>
            <Box
              sx={{
                width: isMobile ? 100 : 120,
                height: isMobile ? 100 : 120,
                borderRadius: "50%",
                bgcolor: alpha(theme.palette.success.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 3,
              }}
            >
              <CheckCircleOutline
                sx={{
                  fontSize: isMobile ? 56 : 68,
                  color: theme.palette.success.main,
                }}
              />
            </Box>
          </Grow>

          {/* Текстовый блок */}
          <Fade in={showContent} timeout={500}>
            <Stack spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
              <Typography
                variant={isMobile ? "h5" : "h4"}
                fontWeight={700}
                color="text.primary"
              >
                Заказ оформлен!
              </Typography>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 380, lineHeight: 1.6 }}
              >
                {orderCount > 1
                  ? `Все ${orderCount} заказов успешно созданы. `
                  : "Ваш заказ успешно создан. "}
                Отслеживайте статус в разделе «Мои покупки».
              </Typography>
            </Stack>
          </Fade>

          {/* Информационные шаги */}
          <Fade in={showContent} timeout={700}>
            <Box
              sx={{
                width: "100%",
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderRadius: 3,
                p: { xs: 2.5, sm: 3 },
                mb: 4,
              }}
            >
              <Stack spacing={2}>
                {[
                  {
                    icon: <CheckCircleOutline fontSize="small" />,
                    text: "Продавец получил ваш заказ",
                  },
                  {
                    icon: <LocalShipping fontSize="small" />,
                    text: "После подтверждения — товар будет отправлен",
                  },
                  {
                    icon: <Receipt fontSize="small" />,
                    text: "Следите за статусом в личном кабинете",
                  },
                ].map((step, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                  >
                    <Box
                      sx={{
                        color: theme.palette.primary.main,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: "left" }}
                    >
                      {step.text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Fade>

          {/* Кнопки */}
          <Fade in={showContent} timeout={900}>
            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={2}
              sx={{ width: isMobile ? "100%" : "auto" }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<Receipt />}
                onClick={onGoToOrders}
                sx={{
                  minWidth: isMobile ? "100%" : 200,
                  textTransform: "none",
                  py: 1.5,
                }}
              >
                Мои покупки
              </Button>

              <Button
                variant="outlined"
                size="large"
                startIcon={<Home />}
                onClick={onGoHome}
                sx={{
                  minWidth: isMobile ? "100%" : 200,
                  textTransform: "none",
                  py: 1.5,
                }}
              >
                На главную
              </Button>
            </Stack>
          </Fade>
        </Box>
      </Fade>
    </Container>
  );
};

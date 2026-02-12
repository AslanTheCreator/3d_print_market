"use client";

import React from "react";
import {
  Container,
  Typography,
  Stack,
  Box,
  alpha,
  useTheme,
} from "@mui/material";
import { Shield } from "@mui/icons-material";
import { ChangePasswordForm } from "@/widgets/change-password-form";

export default function SecurityPage() {
  const theme = useTheme();

  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* Заголовок страницы */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Shield sx={{ color: theme.palette.warning.main }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Безопасность
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Управление паролем и настройками безопасности
          </Typography>
        </Box>
      </Stack>

      {/* Секция смены пароля */}
      <ChangePasswordForm />

      {/* Здесь в будущем: 2FA, активные сессии и т.д. */}
    </Container>
  );
}

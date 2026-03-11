"use client";

import React from "react";
import { Container, Typography, Stack, Box, alpha, useTheme } from "@mui/material";
import { Shield } from "@mui/icons-material";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const DashboardSecurityWidget = () => {
  const theme = useTheme();

  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
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
            {"\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {
              "\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043f\u0430\u0440\u043e\u043b\u0435\u043c \u0438 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u043c\u0438 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438"
            }
          </Typography>
        </Box>
      </Stack>

      <ChangePasswordForm />
    </Container>
  );
};

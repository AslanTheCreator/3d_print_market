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

interface ActionButton {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "contained" | "outlined";
}

interface EmptyPageStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions: ActionButton[];
  tips?: {
    title: string;
    items: string[];
  };
}

export const EmptyPageState: React.FC<EmptyPageStateProps> = ({
  icon,
  title,
  description,
  actions,
  tips,
}) => {
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
        {/* Иконка */}
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
          }}
        >
          {icon}
        </Box>

        {/* Текст */}
        <Stack spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            fontWeight={700}
            color="text.primary"
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 360, lineHeight: 1.6 }}
          >
            {description}
          </Typography>
        </Stack>

        {/* Кнопки */}
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          sx={{ width: isMobile ? "100%" : "auto", mb: tips ? 5 : 0 }}
        >
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={
                action.variant ?? (index === 0 ? "contained" : "outlined")
              }
              size="large"
              startIcon={action.icon}
              onClick={action.onClick}
              sx={{
                minWidth: isMobile ? "100%" : 200,
                textTransform: "none",
                py: 1.5,
              }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>

        {/* Подсказки */}
        {tips && (
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
              {tips.title}
            </Typography>
            <Stack spacing={1}>
              {tips.items.map((tip, index) => (
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
        )}
      </Box>
    </Container>
  );
};

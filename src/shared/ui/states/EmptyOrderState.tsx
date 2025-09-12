"use client";
import React from "react";
import { Box, Typography, Button, Paper, Stack, useTheme } from "@mui/material";
import { ShoppingCart } from "@mui/icons-material";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionButton?: {
    text: string;
    onClick: () => void;
    variant?: "contained" | "outlined" | "text";
  };
  illustration?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionButton,
  illustration,
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        textAlign: "center",
        bgcolor: "background.paper",
        border: `1px dashed ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Stack spacing={3} alignItems="center">
        {/* Иллюстрация или иконка */}
        <Box
          sx={{
            width: 120,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "grey.50",
            borderRadius: "50%",
            color: "grey.400",
          }}
        >
          {illustration || icon || <ShoppingCart sx={{ fontSize: 48 }} />}
        </Box>

        {/* Заголовок */}
        <Typography
          variant="h5"
          fontWeight={600}
          color="text.primary"
          sx={{ maxWidth: 400 }}
        >
          {title}
        </Typography>

        {/* Описание */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 500, lineHeight: 1.6 }}
        >
          {description}
        </Typography>

        {/* Кнопка действия */}
        {actionButton && (
          <Button
            variant={actionButton.variant || "contained"}
            onClick={actionButton.onClick}
            size="large"
            sx={{ mt: 2 }}
          >
            {actionButton.text}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

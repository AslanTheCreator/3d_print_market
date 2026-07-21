"use client";

import React, { useState } from "react";
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { CheckCircleOutline, ContentCopy } from "@mui/icons-material";

interface OrderDetailsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}

export const OrderDetailsSection = ({
  title,
  icon,
  children,
  testId,
}: OrderDetailsSectionProps) => (
  <Paper
    component="section"
    variant="outlined"
    data-testid={testId}
    sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, height: "100%" }}
  >
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
      <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
    </Stack>
    {children}
  </Paper>
);

export const CopyableOrderDetail = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) => {
  const [copied, setCopied] = useState(false);
  const normalizedValue = value.trim();

  const handleCopy = async () => {
    if (!normalizedValue) {
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ py: 0.75, minWidth: 0 }}
    >
      <Box sx={{ color: "text.secondary", display: "flex", flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ overflowWrap: "anywhere" }}
        >
          {normalizedValue || "Не указано"}
        </Typography>
      </Box>
      {normalizedValue && (
        <Tooltip title={copied ? "Скопировано" : "Копировать"}>
          <IconButton
            size="small"
            onClick={() => void handleCopy()}
            aria-label={`Копировать: ${label}`}
          >
            {copied ? (
              <CheckCircleOutline color="success" fontSize="small" />
            ) : (
              <ContentCopy fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
};

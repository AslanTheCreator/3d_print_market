"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  Skeleton,
  Alert,
  Chip,
  alpha,
  useTheme,
  Collapse,
} from "@mui/material";
import { Warning, CheckCircle, InfoOutlined } from "@mui/icons-material";
import { getDeliveryIcon } from "@/entities/transfer";
import { useDictionary } from "@/entities/dictionary";
import { AppLink } from "@/shared/ui/app-link/AppLink";
import { ShippingMethod } from "@/shared/types";

interface DeliveryMethodSelectorProps {
  availableMethods: ShippingMethod[];
  selectedMethod: ShippingMethod | null;
  onMethodSelect: (method: ShippingMethod) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  fallbackMessages?: string[];
  hasFallbacks?: boolean;
}

export const DeliveryMethodSelector: React.FC<DeliveryMethodSelectorProps> = ({
  availableMethods,
  selectedMethod,
  onMethodSelect,
  isLoading = false,
  isError = false,
  errorMessage,
  fallbackMessages = [],
  hasFallbacks = false,
}) => {
  const theme = useTheme();
  const { data: shoppingMethods } = useDictionary("SHOPPING_METHODS");

  const getMethodLabel = (method: ShippingMethod): string => {
    const methodInfo = shoppingMethods?.find((m) => m.value === method);
    return methodInfo?.description || method;
  };

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Способ доставки
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={56}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
      </Paper>
    );
  }

  if (isError) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Способ доставки
        </Typography>
        <Alert severity="info" icon={<InfoOutlined />}>
          {errorMessage || "Не удалось загрузить способы доставки"}. Добавьте
          способ доставки в{" "}
          <AppLink
            href="/dashboard/settings?tab=shipping"
            color="primary"
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            настройках профиля
          </AppLink>
          .
        </Alert>
      </Paper>
    );
  }

  if (availableMethods.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Способ доставки
        </Typography>
        <Alert severity="warning">
          Нет доступных способов доставки для выбранных товаров.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Способ доставки
        </Typography>
        {selectedMethod && !hasFallbacks && (
          <Chip
            icon={<CheckCircle sx={{ fontSize: 16 }} />}
            label="Выбрано"
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Box>

      {/* Предупреждения о fallback */}
      <Collapse in={hasFallbacks && fallbackMessages.length > 0}>
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
          <Box>
            {fallbackMessages.map((msg, idx) => (
              <Typography key={idx} variant="body2">
                {msg}
              </Typography>
            ))}
          </Box>
        </Alert>
      </Collapse>

      <RadioGroup
        value={selectedMethod || ""}
        onChange={(e) => onMethodSelect(e.target.value as ShippingMethod)}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {availableMethods.map((method) => {
            const isSelected = selectedMethod === method;

            return (
              <Paper
                key={method}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: `2px solid ${
                    isSelected
                      ? theme.palette.primary.main
                      : alpha(theme.palette.divider, 0.8)
                  }`,
                  backgroundColor: isSelected
                    ? alpha(theme.palette.primary.main, 0.04)
                    : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: isSelected
                      ? theme.palette.primary.main
                      : theme.palette.primary.light,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                  },
                }}
                onClick={() => onMethodSelect(method)}
              >
                <FormControlLabel
                  value={method}
                  control={
                    <Radio
                      sx={{
                        p: 0,
                        mr: 1.5,
                      }}
                    />
                  }
                  label={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          backgroundColor: isSelected
                            ? alpha(theme.palette.primary.main, 0.1)
                            : alpha(theme.palette.grey[500], 0.1),
                          color: isSelected
                            ? theme.palette.primary.main
                            : theme.palette.text.secondary,
                        }}
                      >
                        {getDeliveryIcon(method)}
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected
                            ? theme.palette.primary.main
                            : theme.palette.text.primary,
                        }}
                      >
                        {getMethodLabel(method)}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    m: 0,
                    width: "100%",
                  }}
                />
              </Paper>
            );
          })}
        </Box>
      </RadioGroup>
    </Paper>
  );
};

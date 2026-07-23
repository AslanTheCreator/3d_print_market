"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
  useTheme,
  useMediaQuery,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  CheckCircle,
  Error,
  Warning,
  ShoppingBag,
  Refresh,
  Home,
  Receipt,
  ArrowBack,
} from "@mui/icons-material";
import { CheckoutResult } from "../model/types";

interface CheckoutResultDialogProps {
  open: boolean;
  result: CheckoutResult | null;
  onClose: () => void;
  onRetry?: () => void;
  onGoHome: () => void;
  onGoToOrders: () => void;
  isRetrying?: boolean;
}

export const CheckoutResultDialog: React.FC<CheckoutResultDialogProps> = ({
  open,
  result,
  onClose,
  onRetry,
  onGoHome,
  onGoToOrders,
  isRetrying = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (!result) return null;

  const isFullSuccess = result.successCount === result.totalCount;
  const isPartialSuccess =
    result.successCount > 0 && result.successCount < result.totalCount;
  const hasRetryableFailures = result.failed.some(
    (item) => item.retryable !== false,
  );
  const getDialogIcon = () => {
    if (isFullSuccess) {
      return (
        <CheckCircle sx={{ fontSize: 64, color: theme.palette.success.main }} />
      );
    }
    if (isPartialSuccess) {
      return (
        <Warning sx={{ fontSize: 64, color: theme.palette.warning.main }} />
      );
    }
    return <Error sx={{ fontSize: 64, color: theme.palette.error.main }} />;
  };

  const getDialogTitle = () => {
    if (isFullSuccess) return "Заказы успешно оформлены!";
    if (isPartialSuccess) return "Часть заказов оформлена";
    return "Не удалось оформить заказы";
  };

  const getDialogDescription = () => {
    if (isFullSuccess) {
      return `Все ${result.totalCount} ${getItemWord(result.totalCount)} успешно оформлены. Вы можете отслеживать их статус в разделе "Мои покупки".`;
    }
    if (isPartialSuccess) {
      return hasRetryableFailures
        ? `Оформлено ${result.successCount} из ${result.totalCount} ${getItemWord(result.totalCount)}. Повторите неудачные заказы или вернитесь к оформлению.`
        : `Оформлено ${result.successCount} из ${result.totalCount} ${getItemWord(result.totalCount)}. Вернитесь к оформлению, чтобы проверить недоступные товары.`;
    }
    return hasRetryableFailures
      ? "Заказы не были оформлены. Повторите попытку или вернитесь к оформлению, чтобы проверить товары и доставку."
      : "Заказы не были оформлены. Вернитесь к оформлению, чтобы проверить недоступные товары.";
  };

  return (
    <Dialog
      data-testid="checkout-result-dialog"
      open={open}
      onClose={isRetrying ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
        },
      }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt: 2,
          }}
        >
          {getDialogIcon()}
          <Typography
            data-testid="checkout-result-title"
            variant="h5"
            fontWeight={700}
            sx={{ mt: 2, textAlign: "center" }}
          >
            {getDialogTitle()}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: "center", mb: 3 }}
        >
          {getDialogDescription()}
        </Typography>

        {/* Успешные заказы */}
        {result.success.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <CheckCircle
                sx={{ fontSize: 20, color: theme.palette.success.main }}
              />
              <Typography variant="subtitle2" fontWeight={600}>
                Успешно оформлено ({result.success.length})
              </Typography>
            </Box>
            <List
              dense
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.05),
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              {result.success.map((item, index) => (
                <ListItem
                  key={item.productId}
                  divider={index < result.success.length - 1}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ShoppingBag
                      sx={{
                        fontSize: 20,
                        color: theme.palette.success.main,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.productName}
                    primaryTypographyProps={{
                      variant: "body2",
                      noWrap: true,
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Неудачные заказы */}
        {result.failed.length > 0 && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <Error sx={{ fontSize: 20, color: theme.palette.error.main }} />
              <Typography variant="subtitle2" fontWeight={600}>
                Не удалось оформить ({result.failed.length})
              </Typography>
            </Box>
            <List
              dense
              sx={{
                bgcolor: alpha(theme.palette.error.main, 0.05),
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              }}
            >
              {result.failed.map((item, index) => (
                <ListItem
                  key={item.productId}
                  divider={index < result.failed.length - 1}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ShoppingBag
                      sx={{
                        fontSize: 20,
                        color: theme.palette.error.main,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.productName}
                    secondary={item.errorMessage}
                    primaryTypographyProps={{
                      variant: "body2",
                      noWrap: true,
                    }}
                    secondaryTypographyProps={{
                      variant: "caption",
                      color: "error",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions
        sx={{
          p: 2,
          flexDirection: isMobile ? "column" : "row",
          gap: 1,
        }}
      >
        {hasRetryableFailures && onRetry && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={
              isRetrying ? <CircularProgress size={20} /> : <Refresh />
            }
            onClick={onRetry}
            disabled={isRetrying}
            fullWidth={isMobile}
          >
            {isRetrying ? "Повторяем..." : "Повторить для неудачных"}
          </Button>
        )}

        {result.failed.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBack />}
            onClick={onClose}
            disabled={isRetrying}
            fullWidth={isMobile}
          >
            Вернуться к оформлению
          </Button>
        )}

        {result.success.length > 0 && (
          <Button
            variant={result.failed.length > 0 ? "outlined" : "contained"}
            color="primary"
            startIcon={<Receipt />}
            onClick={onGoToOrders}
            fullWidth={isMobile}
          >
            Мои покупки
          </Button>
        )}

        <Button
          variant={result.failed.length > 0 ? "text" : "outlined"}
          startIcon={<Home />}
          onClick={onGoHome}
          fullWidth={isMobile}
        >
          На главную
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Вспомогательная функция для склонения
function getItemWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return "заказов";
  }

  if (lastDigit === 1) {
    return "заказ";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "заказа";
  }

  return "заказов";
}

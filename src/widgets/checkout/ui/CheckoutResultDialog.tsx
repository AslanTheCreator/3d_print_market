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
  Chip,
  CircularProgress,
  Alert,
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
  hasPrepaymentSuccess?: boolean;
  retryMessage?: string | null;
}

export const CheckoutResultDialog: React.FC<CheckoutResultDialogProps> = ({
  open,
  result,
  onClose,
  onRetry,
  onGoHome,
  onGoToOrders,
  isRetrying = false,
  hasPrepaymentSuccess = false,
  retryMessage,
}) => {
  const theme = useTheme();

  if (!result) return null;

  const isFullSuccess = result.successCount === result.totalCount;
  const isPartialSuccess =
    result.successCount > 0 && result.successCount < result.totalCount;
  const unknown = result.failed.filter(item => item.status === "unknown");
  const rejected = result.failed.filter(item => item.status === "error");
  const hasRetryableFailures = unknown.length === 0 && result.failed.some(
    (item) => item.status === "error" && item.retryable === true,
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
    if (unknown.length > 0) return "Результат оформления неизвестен";
    return "Не удалось оформить заказы";
  };

  const getDialogDescription = () => {
    if (unknown.length > 0) {
      return `Подтверждено заказов: ${result.successCount} из ${result.totalCount}. Для ${unknown.length} результат неизвестен: заказы могли быть созданы. Повтор заблокирован. Проверьте «Мои покупки» и корзину; отсутствие заказа в списке не подтверждает отказ.`;
    }
    if (isFullSuccess) {
      const baseDescription = `Все ${result.totalCount} ${getItemWord(result.totalCount)} успешно оформлены.`;

      return hasPrepaymentSuccess
        ? `${baseDescription} Для заказа с предоплатой продавец сначала подтвердит заказ, затем потребуется внести предоплату и после её подтверждения — оплатить остаток. Следите за этапами в разделе "Мои покупки".`
        : `${baseDescription} Вы можете отслеживать их статус в разделе "Мои покупки".`;
    }
    if (isPartialSuccess) {
      const baseDescription = hasRetryableFailures
        ? `Оформлено ${result.successCount} из ${result.totalCount} ${getItemWord(result.totalCount)}. Повторите неудачные заказы или вернитесь к оформлению.`
        : `Оформлено ${result.successCount} из ${result.totalCount} ${getItemWord(result.totalCount)}. Вернитесь к оформлению, чтобы проверить недоступные товары.`;

      return hasPrepaymentSuccess
        ? `${baseDescription} Для оформленных заказов с предоплатой следующим этапом будет подтверждение продавцом, затем предоплата и оплата остатка.`
        : baseDescription;
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
      PaperProps={{
        sx: {
          m: { xs: 0, sm: 4 },
          width: { xs: "100%", sm: "calc(100% - 64px)" },
          maxWidth: { xs: "none", sm: 600 },
          height: { xs: "100%", sm: "auto" },
          maxHeight: { xs: "100%", sm: "calc(100% - 64px)" },
          borderRadius: { xs: 0, sm: 3 },
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
        {retryMessage && <Alert severity="warning" sx={{ mb: 2 }}>{retryMessage}</Alert>}
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
        {unknown.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Результат неизвестен ({unknown.length})</Typography>
            <List>{unknown.map(item => <ListItem key={item.productId}>
              <ListItemText primary={item.productName} secondary="Заказ мог быть создан. Не отправляйте его повторно." />
            </ListItem>)}</List>
          </Box>
        )}
        {rejected.length > 0 && (
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
                Не удалось оформить ({rejected.length})
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
              {rejected.map((item, index) => (
                <ListItem
                  key={item.productId}
                  divider={index < rejected.length - 1}
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
          flexDirection: { xs: "column", sm: "row" },
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
            sx={{ width: { xs: "100%", sm: "auto" } }}
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
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Вернуться к оформлению
          </Button>
        )}

        {(result.success.length > 0 || unknown.length > 0) && (
          <Button
            variant={result.failed.length > 0 ? "outlined" : "contained"}
            color="primary"
            startIcon={<Receipt />}
            onClick={onGoToOrders}
            disabled={isRetrying}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Мои покупки
          </Button>
        )}

        <Button
          variant={result.failed.length > 0 ? "text" : "outlined"}
          startIcon={<Home />}
          onClick={onGoHome}
          disabled={isRetrying}
          sx={{ width: { xs: "100%", sm: "auto" } }}
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

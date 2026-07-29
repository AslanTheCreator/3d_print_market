"use client";
import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Stack,
  IconButton,
  Typography,
  Paper,
  Alert,
} from "@mui/material";
import { Close, CheckCircle } from "@mui/icons-material";
import {
  getOrderPaymentBreakdown,
  type ListOrdersModel,
} from "@/entities/order";
import { formatPrice } from "@/shared/lib";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { UseMutationResult } from "@tanstack/react-query";

// Типы для различных видов подтверждения
export type ConfirmationType = "order" | "preorder";

// Интерфейс для параметров мутации заказа
interface OrderConfirmationParams {
  orderId: number;
  comment?: string;
}

// Интерфейс для параметров мутации предзаказа
interface PreOrderConfirmationParams {
  orderId: number;
  comment?: string;
}

// Юнион тип для всех возможных параметров
interface BaseConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  order: ListOrdersModel;
}

interface OrderConfirmationDialogProps extends BaseConfirmationDialogProps {
  confirmationType: "order";
  confirmationMutation: UseMutationResult<
    number,
    unknown,
    OrderConfirmationParams,
    unknown
  >;
}

interface PreOrderConfirmationDialogProps extends BaseConfirmationDialogProps {
  confirmationType: "preorder";
  confirmationMutation: UseMutationResult<
    number,
    unknown,
    PreOrderConfirmationParams,
    unknown
  >;
}

type ConfirmationDialogProps =
  | OrderConfirmationDialogProps
  | PreOrderConfirmationDialogProps;

// Интерфейс для пропсов компонента
interface ConfirmationConfig {
  title: string;
  description: string;
  buttonText: string;
  buttonLoadingText: string;
}

const confirmationConfig = {
  regularOrder: {
    title: "Подтвердить заказ",
    description:
      "Вы уверены, что хотите подтвердить заказ #{orderId}? После подтверждения покупатель сможет перейти к оплате.",
    buttonText: "Подтвердить заказ",
    buttonLoadingText: "Подтверждение...",
  },
  initialPreorder: {
    title: "Подтвердить предзаказ",
    description:
      "Вы уверены, что хотите подтвердить предзаказ #{orderId}? После подтверждения покупатель сможет перейти к предоплате.",
    buttonText: "Подтвердить предзаказ",
    buttonLoadingText: "Подтверждение...",
  },
  prepaymentApproval: {
    title: "Подтвердить предоплату",
    description:
      "Вы уверены, что хотите подтвердить предоплату по заказу #{orderId}? После подтверждения покупатель сможет перейти к оплате остатка.",
    buttonText: "Подтвердить предоплату",
    buttonLoadingText: "Подтверждение...",
  },
};

const getConfirmationConfig = (
  confirmationType: ConfirmationType,
  isPreorder: boolean,
): ConfirmationConfig => {
  if (confirmationType === "preorder") {
    return confirmationConfig.prepaymentApproval;
  }

  return isPreorder
    ? confirmationConfig.initialPreorder
    : confirmationConfig.regularOrder;
};

export const ConfirmationDialog = ({
  open,
  onClose,
  order,
  confirmationType,
  confirmationMutation,
}: ConfirmationDialogProps) => {
  const config = getConfirmationConfig(
    confirmationType,
    order.product.availability === "PREORDER",
  );
  const mutationErrorMessage = confirmationMutation.error
    ? transformToApiError(confirmationMutation.error).message
    : null;
  const paymentBreakdown = getOrderPaymentBreakdown(order);
  const expectedOrderStatus =
    confirmationType === "preorder"
      ? "AWAITING_PREPAYMENT_APPROVAL"
      : "BOOKED";
  const isExpectedOrderStatus = order.actualStatus === expectedOrderStatus;

  const handleClose = () => {
    confirmationMutation.reset();
    onClose();
  };

  const handleConfirm = () => {
    if (!isExpectedOrderStatus) {
      return;
    }

    if (confirmationType === "order") {
      confirmationMutation.mutate(
        {
          orderId: order.orderId,
        },
        {
          onSuccess: () => {
            handleClose();
          },
        },
      );
    } else {
      confirmationMutation.mutate(
        {
          orderId: order.orderId,
        },
        {
          onSuccess: () => {
            handleClose();
          },
        },
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <CheckCircle color="primary" />
            <Typography variant="h6">{config.title}</Typography>
          </Stack>
          <IconButton
            onClick={handleClose}
            size="small"
            disabled={confirmationMutation.isPending}
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: "grey.50" }}>
          <Typography variant="subtitle2" gutterBottom>
            Заказ #{order.orderId}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {order.product.name}
          </Typography>
          <Stack spacing={0.25}>
            <Typography variant="h6" color="text.primary" fontWeight={600}>
              Стоимость товаров:{" "}
              {formatPrice(
                paymentBreakdown.productTotal,
                order.product.currency,
              )}
            </Typography>
            {paymentBreakdown.isPreorder && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Предоплата:{" "}
                  {formatPrice(
                    paymentBreakdown.prepaymentTotal,
                    order.product.currency,
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Остаток:{" "}
                  {formatPrice(
                    paymentBreakdown.remainingTotal,
                    order.product.currency,
                  )}
                </Typography>
              </>
            )}
          </Stack>
        </Paper>

        <Typography variant="body2" color="text.secondary">
          {config.description.replace("{orderId}", order.orderId.toString())}
        </Typography>

        {mutationErrorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Не удалось выполнить подтверждение: {mutationErrorMessage}
          </Alert>
        )}

        {!isExpectedOrderStatus && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Статус заказа уже обновился. Закройте диалог и проверьте актуальный
            этап заказа.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={confirmationMutation.isPending}
        >
          Отмена
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={
            confirmationMutation.isPending || !isExpectedOrderStatus
          }
          startIcon={confirmationMutation.isPending ? null : <CheckCircle />}
        >
          {confirmationMutation.isPending
            ? config.buttonLoadingText
            : config.buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

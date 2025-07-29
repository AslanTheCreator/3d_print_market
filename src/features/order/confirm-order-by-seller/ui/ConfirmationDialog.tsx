"use client";
import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Stack,
  IconButton,
  Typography,
} from "@mui/material";
import { Close, CheckCircle } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order/model/types";
import { UseMutationResult } from "@tanstack/react-query";

// Типы для различных видов подтверждения
export type ConfirmationType = "order" | "preorder";

// Интерфейс для параметров мутации заказа
interface OrderConfirmationParams {
  orderId: number;
  accountId: number;
  comment?: string;
}

// Интерфейс для параметров мутации предзаказа
interface PreOrderConfirmationParams {
  orderId: number;
  comment?: string;
}

// Юнион тип для всех возможных параметров
type ConfirmationMutationParams =
  | OrderConfirmationParams
  | PreOrderConfirmationParams;

// Интерфейс для пропсов компонента
interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  order: ListOrdersModel;
  confirmationType: ConfirmationType;
  confirmationMutation: UseMutationResult<
    any,
    Error,
    ConfirmationMutationParams,
    unknown
  >;
}

// Конфигурация для разных типов подтверждения
const confirmationConfig = {
  order: {
    title: "Подтвердить заказ",
    description:
      "Вы уверены, что хотите подтвердить заказ #{orderId}? После подтверждения покупатель сможет перейти к оплате.",
    buttonText: "Подтвердить заказ",
    buttonLoadingText: "Подтверждение...",
  },
  preorder: {
    title: "Подтвердить предзаказ",
    description:
      "Вы уверены, что хотите подтвердить предзаказ #{orderId}? После подтверждения покупатель сможет перейти к предоплате.",
    buttonText: "Подтвердить предзаказ",
    buttonLoadingText: "Подтверждение...",
  },
};

export const ConfirmationDialog = ({
  open,
  onClose,
  order,
  confirmationType,
  confirmationMutation,
}: ConfirmationDialogProps) => {
  // Получаем конфигурацию для текущего типа подтверждения
  const config = confirmationConfig[confirmationType];

  const handleConfirm = () => {
    if (confirmationType === "order") {
      // Для обычного заказа нужен accountId
      confirmationMutation.mutate(
        {
          orderId: order.orderId,
          accountId: order.userInfo.id,
        } as OrderConfirmationParams,
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      // Для предзаказа accountId не нужен
      confirmationMutation.mutate(
        {
          orderId: order.orderId,
        } as PreOrderConfirmationParams,
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <DialogContentText>
          {config.description.replace("{orderId}", order.orderId.toString())}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={confirmationMutation.isPending}>
          Отмена
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={confirmationMutation.isPending}
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

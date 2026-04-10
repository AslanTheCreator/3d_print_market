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
import { ListOrdersModel } from "@/entities/order";
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

interface ConfirmationConfigMap {
  order: ConfirmationConfig;
  preorder: ConfirmationConfig;
}

const confirmationConfig: ConfirmationConfigMap = {
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
        },
        {
          onSuccess: () => {
            onClose();
          },
        },
      );
    } else {
      // Для предзаказа accountId не нужен
      confirmationMutation.mutate(
        {
          orderId: order.orderId,
        },
        {
          onSuccess: () => {
            onClose();
          },
        },
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

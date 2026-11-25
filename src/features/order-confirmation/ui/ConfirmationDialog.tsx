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
  OrderCalculationSummary,
  orderQueryKeys,
  hasOrderPrepayment,
  type ListOrdersModel,
} from "@/entities/order";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { useIsMutating, useQueryClient, type MutationFilters, type UseMutationResult } from "@tanstack/react-query";
import { usePrivateScope } from "@/shared/lib/query";

// Интерфейс для параметров мутации заказа
interface OrderConfirmationParams {
  orderId: number;
  comment?: string;
}

interface BaseConfirmationDialogProps {
  open: boolean;
  actionsAvailable?: boolean;
  onRetry?: () => void;
  retryPending?: boolean;
  onClose: () => void;
  order: ListOrdersModel;
}

interface OrderConfirmationDialogProps extends BaseConfirmationDialogProps {
  confirmationMutation: UseMutationResult<
    number,
    unknown,
    OrderConfirmationParams,
    unknown
  >;
}

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
      "Вы уверены, что хотите подтвердить заказ #{orderId}? После подтверждения покупатель сможет перейти к {paymentStage}.",
    buttonText: "Подтвердить заказ",
    buttonLoadingText: "Подтверждение...",
  },
  initialPreorder: {
    title: "Подтвердить предзаказ",
    description:
      "Вы уверены, что хотите подтвердить предзаказ #{orderId}? После подтверждения покупатель сможет перейти к {paymentStage}.",
    buttonText: "Подтвердить предзаказ",
    buttonLoadingText: "Подтверждение...",
  },
};

const getConfirmationConfig = (
  isPreorder: boolean,
  hasPrepayment: boolean,
): ConfirmationConfig => {
  const config = isPreorder
    ? confirmationConfig.initialPreorder
    : confirmationConfig.regularOrder;

  return {
    ...config,
    description: config.description.replace(
      "{paymentStage}",
      hasPrepayment ? "предоплате" : "оплате",
    ),
  };
};

export const ConfirmationDialog = ({
  open,
  actionsAvailable = true,
  onRetry,
  retryPending = false,
  onClose,
  order,
  confirmationMutation,
}: OrderConfirmationDialogProps) => {
  const scope = usePrivateScope();
  const client = useQueryClient();
  const filter: MutationFilters = {
    mutationKey: scope.key(orderQueryKeys.sellerConfirmation("order")),
    exact: true,
    predicate: mutation => {
      const variables = mutation.state.variables;
      return typeof variables === "object" && variables !== null && "orderId" in variables && variables.orderId === order.orderId;
    },
  };
  const pending = useIsMutating(filter) > 0;
  const config = getConfirmationConfig(
    order.product.availability === "PREORDER",
    hasOrderPrepayment(order),
  );
  const mutationErrorMessage = confirmationMutation.error
    ? transformToApiError(confirmationMutation.error).message
    : null;
  const isExpectedOrderStatus = order.actualStatus === "BOOKED";

  const handleClose = () => {
    if (client.isMutating(filter) > 0) return;
    confirmationMutation.reset();
    onClose();
  };

  const handleConfirm = () => {
    if (!open || !scope.isCurrent() || !actionsAvailable || client.isMutating(filter) > 0 || !isExpectedOrderStatus) {
      return;
    }

    confirmationMutation.mutate({ orderId: order.orderId }, { onSuccess: handleClose });
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
            disabled={pending}
            aria-label={`Закрыть окно «${config.title}»`}
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {!actionsAvailable && <Alert severity="warning" action={onRetry && <Button color="inherit" disabled={retryPending} onClick={onRetry}>Повторить загрузку</Button>}>Не удалось обновить заказы. Подтверждение недоступно до успешной загрузки.</Alert>}
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: "grey.50" }}>
          <Typography variant="subtitle2" gutterBottom>
            Заказ #{order.orderId}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {order.product.name}
          </Typography>
          <OrderCalculationSummary order={order} />
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
          disabled={pending}
        >
          Отмена
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={
            pending || !actionsAvailable || !isExpectedOrderStatus
          }
          startIcon={pending ? null : <CheckCircle />}
        >
          {pending
            ? config.buttonLoadingText
            : config.buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

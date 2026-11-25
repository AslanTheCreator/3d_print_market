"use client";

import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Box,
  Typography,
  Paper,
  Alert,
} from "@mui/material";
import { Payment, ThumbUp, Cancel, RateReview } from "@mui/icons-material";
import {
  OrderCalculationSummary,
  getOrderPaymentBreakdown,
  ListOrdersModel,
  getCustomerOrderActionFlags,
} from "@/entities/order";
import {
  PaymentDialog,
  useOrderPaymentAction,
} from "@/features/order-payment";
import { useOrderReceiptAction } from "@/features/order-receipt";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { LeaveReviewDialog } from "./LeaveReviewDialog";
import { OrderRefreshWarning } from "./OrderRefreshWarning";

import { useOrderActionsRecovery } from "../model/orderActionsContext";
import { useLeaveReview } from "../model/useLeaveReview";

interface CustomerActionsProps {
  order: ListOrdersModel;
  secondaryAction?: React.ReactNode;
}

export const CustomerActions = ({ order, secondaryAction }: CustomerActionsProps) => {
  const { actionsAvailable, retry, retryPending } = useOrderActionsRecovery(order.orderId);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const review = useLeaveReview({ order, open: reviewDialogOpen, onClose: () => setReviewDialogOpen(false) });

  const paymentAction = useOrderPaymentAction();
  const prepaymentAction = useOrderPaymentAction();
  const receiptAction = useOrderReceiptAction();
  const receiptErrorMessage = receiptAction.mutation.error
    ? transformToApiError(receiptAction.mutation.error).message
    : null;
  const isReceiptStatusCurrent = order.actualStatus === "ON_THE_WAY";
  const {
    canPay,
    canPrePay,
    canConfirmReceipt,
    canCancel,
  } = getCustomerOrderActionFlags(order.actualStatus);

  const calculation = getOrderPaymentBreakdown(order);
  const paymentBlock = canPay ? calculation.paymentBlock : canPrePay ? calculation.prepaymentBlock : null;

  const handleConfirmReceipt = () => {
    if (!actionsAvailable || receiptAction.mutation.isPending || !isReceiptStatusCurrent) {
      return;
    }

    receiptAction.mutation.mutate(
      {
        orderId: order.orderId,
      },
      {
        onSuccess: () => {
          receiptAction.close();
        },
      },
    );
  };

  const primaryAction = canPay
    ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Payment />}
          disabled={!actionsAvailable || !!paymentBlock}
          onClick={paymentAction.open}
          size="small"
          fullWidth={true}
        >
          Подтвердить оплату
        </Button>
      )
    : canPrePay
      ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Payment />}
            disabled={!actionsAvailable || !!paymentBlock}
            onClick={prepaymentAction.open}
            size="small"
            fullWidth={true}
          >
            Подтвердить предоплату
          </Button>
        )
      : canConfirmReceipt
        ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<ThumbUp />}
              onClick={receiptAction.open}
              disabled={!actionsAvailable || receiptAction.mutation.isPending}
              size="small"
              fullWidth={true}
            >
              {receiptAction.mutation.isPending
                ? "Подтверждение..."
                : "Подтвердить получение"}
            </Button>
          )
        : review.canLeaveReview
          ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<RateReview />}
                disabled={!actionsAvailable}
                onClick={() => setReviewDialogOpen(true)}
                size="small"
                fullWidth={true}
              >
                Оставить отзыв
              </Button>
            )
          : null;

  return (
    <>
      <Stack spacing={0.75}>
        {primaryAction}
        {paymentBlock && <Typography variant="caption">{paymentBlock}</Typography>}
        {review.publishedHere && <Typography variant="caption">Отзыв оставлен</Typography>}
        {review.isChecking && <Typography variant="caption" role="status">Проверяем состояние отзыва…</Typography>}
        {review.needsCheck && (
          <Button sx={{ minHeight: 44 }} onClick={() => void review.checkResult()}>
            Проверить состояние отзыва
          </Button>
        )}

        {(secondaryAction || canCancel) && (
          <Box>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="space-between">
              {canCancel && (
                <Button
                  variant="text"
                  color="error"
                  startIcon={<Cancel />}
                  disabled={!actionsAvailable}
                  onClick={() => setCancelDialogOpen(true)}
                  size="small"
                  sx={{ px: 0.5, ...(secondaryAction && { color: "text.secondary" }) }}
                >
                  Отменить
                </Button>
              )}

              {secondaryAction}
            </Stack>
          </Box>
        )}
      </Stack>

      <PaymentDialog
        actionsAvailable={actionsAvailable}
        onRetry={retry}
        retryPending={retryPending}
        open={paymentAction.isOpen}
        onClose={paymentAction.close}
        order={order}
        paymentType="payment"
      />

      <PaymentDialog
        actionsAvailable={actionsAvailable}
        onRetry={retry}
        retryPending={retryPending}
        open={prepaymentAction.isOpen}
        onClose={prepaymentAction.close}
        order={order}
        paymentType="prepayment"
      />

      <Dialog
        open={receiptAction.isOpen}
        onClose={() => {
          if (!receiptAction.mutation.isPending) {
            receiptAction.close();
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>Подтвердить получение заказа</DialogTitle>
        <DialogContent>
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
            Подтвердите получение, если заказ доставлен и всё в порядке.
          </Typography>

          {receiptErrorMessage && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Не удалось подтвердить получение: {receiptErrorMessage}
            </Alert>
          )}

          <OrderRefreshWarning orderId={order.orderId} />

          {!isReceiptStatusCurrent && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Статус заказа уже обновился. Закройте диалог и проверьте
              актуальный этап заказа.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={receiptAction.close}
            disabled={receiptAction.mutation.isPending}
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirmReceipt}
            variant="contained"
            color="success"
            disabled={
              receiptAction.mutation.isPending || !actionsAvailable || !isReceiptStatusCurrent
            }
          >
            Подтвердить получение
          </Button>
        </DialogActions>
      </Dialog>

      <CancelOrderDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        order={order}
        userRole="customer"
      />

      <LeaveReviewDialog
        orderId={order.orderId}
        product={order.product}
        review={review}
      />
    </>
  );
};

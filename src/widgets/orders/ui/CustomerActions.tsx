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
  getOrderPaymentBreakdown,
  ListOrdersModel,
  getCustomerOrderActionFlags,
} from "@/entities/order";
import {
  PaymentDialog,
  useOrderPaymentAction,
  useOrderPrepaymentAction,
} from "@/features/order-payment";
import { useOrderReceiptAction } from "@/features/order-receipt";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { formatPrice } from "@/shared/lib";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { LeaveReviewDialog } from "./LeaveReviewDialog";

interface CustomerActionsProps {
  order: ListOrdersModel;
}

export const CustomerActions = ({ order }: CustomerActionsProps) => {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const paymentAction = useOrderPaymentAction();
  const prepaymentAction = useOrderPrepaymentAction();
  const receiptAction = useOrderReceiptAction();
  const receiptErrorMessage = receiptAction.mutation.error
    ? transformToApiError(receiptAction.mutation.error).message
    : null;
  const paymentBreakdown = getOrderPaymentBreakdown(order);
  const isReceiptStatusCurrent = order.actualStatus === "ON_THE_WAY";
  const {
    canPay,
    canPrePay,
    canConfirmReceipt,
    canCancel,
    canLeaveReview,
  } = getCustomerOrderActionFlags(order.actualStatus);

  const handleConfirmReceipt = () => {
    if (!isReceiptStatusCurrent) {
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
              disabled={receiptAction.mutation.isPending}
              size="small"
              fullWidth={true}
            >
              {receiptAction.mutation.isPending
                ? "Подтверждение..."
                : "Подтвердить получение"}
            </Button>
          )
        : canLeaveReview
          ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<RateReview />}
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

        {(canCancel || (canLeaveReview && !primaryAction)) && (
          <Box>
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {canCancel && (
                <Button
                  variant="text"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => setCancelDialogOpen(true)}
                  size="small"
                  sx={{ px: 0.5 }}
                >
                  Отменить
                </Button>
              )}

              {canLeaveReview && !primaryAction && (
                <Button
                  variant="text"
                  color="primary"
                  startIcon={<RateReview />}
                  onClick={() => setReviewDialogOpen(true)}
                  size="small"
                  sx={{ px: 0.5 }}
                >
                  Оставить отзыв
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </Stack>

      <PaymentDialog
        open={paymentAction.isOpen}
        onClose={paymentAction.close}
        order={order}
        paymentType="payment"
        paymentMutation={paymentAction.mutation}
      />

      <PaymentDialog
        open={prepaymentAction.isOpen}
        onClose={prepaymentAction.close}
        order={order}
        paymentType="prepayment"
        paymentMutation={prepaymentAction.mutation}
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
            Подтвердите получение, если заказ доставлен и всё в порядке.
          </Typography>

          {receiptErrorMessage && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Не удалось подтвердить получение: {receiptErrorMessage}
            </Alert>
          )}

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
              receiptAction.mutation.isPending || !isReceiptStatusCurrent
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
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        orderId={order.orderId}
        product={order.product}
      />
    </>
  );
};

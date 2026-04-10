"use client";

import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from "@mui/material";
import { Payment, ThumbUp, Cancel, RateReview } from "@mui/icons-material";
import {
  ListOrdersModel,
  getCustomerOrderActionFlags,
} from "@/entities/order";
import {
  PaymentDialog,
  useOrderPaymentAction,
  useOrderPrepaymentAction,
} from "@/features/order-payment";
import { useOrderReceiptAction } from "@/features/order-receipt";
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
  const {
    canPay,
    canPrePay,
    canConfirmReceipt,
    canCancel,
    canLeaveReview,
  } = getCustomerOrderActionFlags(order.actualStatus);

  const handleConfirmReceipt = () => {
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

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {canPay && (
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
        )}
        {canPrePay && (
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
        )}
        {canConfirmReceipt && (
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
        )}
        {canCancel && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Cancel />}
            onClick={() => setCancelDialogOpen(true)}
            size="small"
            fullWidth={true}
          >
            Отменить
          </Button>
        )}

        {canLeaveReview && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RateReview />}
            onClick={() => setReviewDialogOpen(true)}
            size="small"
            fullWidth={true}
          >
            Оставить отзыв
          </Button>
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
        onClose={receiptAction.close}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Подтвердить получение заказа</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что получили заказ #{order.orderId} и он соответствует
            описанию? После подтверждения заказ будет считаться завершенным.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
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
            disabled={receiptAction.mutation.isPending}
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

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
import { ListOrdersModel } from "@/entities/order";
import {
  useConfirmPaymentByCustomer,
  useConfirmPrepaymentByCustomer,
  useConfirmReceiptByCustomer,
} from "@/entities/order";
import PaymentDialog from "@/features/order/confirm-payment-by-customer/ui/PaymentDialog";
import { CancelOrderDialog } from "@/features/order/cancel-order/ui/CancelOrderDialog";
import { LeaveReviewDialog } from "@/features/reviews/leave-review";

interface CustomerActionsProps {
  order: ListOrdersModel;
}

export const CustomerActions = ({ order }: CustomerActionsProps) => {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [prepaymentDialogOpen, setPrepaymentDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const canLeaveReview = order.actualStatus === "COMPLETED";

  const confirmReceiptMutation = useConfirmReceiptByCustomer();

  const handleConfirmReceipt = () => {
    confirmReceiptMutation.mutate(
      {
        orderId: order.orderId,
      },
      {
        onSuccess: () => {
          setReceiptDialogOpen(false);
        },
      },
    );
  };

  const canPay = order.actualStatus === "AWAITING_PAYMENT";
  const canPrePay = order.actualStatus === "AWAITING_PREPAYMENT";
  const canConfirmReceipt = order.actualStatus === "ON_THE_WAY";

  // Можно отменить на любом статусе, кроме завершённых
  const canCancel = !["COMPLETED", "FAILED", "DISPUTED"].includes(
    order.actualStatus,
  );

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {canPay && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Payment />}
            onClick={() => setPaymentDialogOpen(true)}
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
            onClick={() => setPrepaymentDialogOpen(true)}
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
            onClick={() => setReceiptDialogOpen(true)}
            disabled={confirmReceiptMutation.isPending}
            size="small"
            fullWidth={true}
          >
            {confirmReceiptMutation.isPending
              ? "Подтверждение..."
              : "Подтвердить получение"}
          </Button>
        )}
        {/* Кнопка отмены заказа */}
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

      {/* Диалог оплаты */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        order={order}
        paymentType="payment"
        paymentMutation={useConfirmPaymentByCustomer()}
      />

      {/* Диалог предоплаты */}
      <PaymentDialog
        open={prepaymentDialogOpen}
        onClose={() => setPrepaymentDialogOpen(false)}
        order={order}
        paymentType="prepayment"
        paymentMutation={useConfirmPrepaymentByCustomer()}
      />

      {/* Диалог подтверждения получения */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
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
            onClick={() => setReceiptDialogOpen(false)}
            disabled={confirmReceiptMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirmReceipt}
            variant="contained"
            color="success"
            disabled={confirmReceiptMutation.isPending}
          >
            Подтвердить получение
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог отмены заказа */}
      <CancelOrderDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        order={order}
        userRole="customer"
      />

      {/* Диалог оставления отзыва */}
      <LeaveReviewDialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        orderId={order.orderId}
        product={order.product}
      />
    </>
  );
};

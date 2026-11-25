"use client";

import React, { useState } from "react";
import { Button, Stack, Box } from "@mui/material";
import { CheckCircle, LocalShipping, Cancel } from "@mui/icons-material";
import { ListOrdersModel, getSellerOrderActionFlags } from "@/entities/order";
import {
  ConfirmationDialog,
  useOrderConfirmationAction,
} from "@/features/order-confirmation";
import { SellerPaymentReview } from "@/features/order-payment";
import { CancelOrderDialog } from "./CancelOrderDialog";
import ShippingDialog from "./ShippingDialog";

import { useOrderActionsRecovery } from "../model/orderActionsContext";

interface SellerActionsProps {
  order: ListOrdersModel;
  secondaryAction?: React.ReactNode;
}

export const SellerActions = ({ order, secondaryAction }: SellerActionsProps) => {
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const { actionsAvailable, retry, retryPending } = useOrderActionsRecovery(order.orderId);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const confirmationAction = useOrderConfirmationAction();
  const isPreorder = order.product.availability === "PREORDER";
  const { canConfirmOrder, canShipOrder, canCancel } =
    getSellerOrderActionFlags(order.actualStatus);

  const primaryAction = canConfirmOrder
    ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<CheckCircle />}
          onClick={confirmationAction.open}
          disabled={!actionsAvailable || confirmationAction.mutation.isPending}
          size="small"
          fullWidth={true}
        >
          {confirmationAction.mutation.isPending
            ? "Подтверждение..."
            : isPreorder
              ? "Подтвердить предзаказ"
              : "Подтвердить заказ"}
        </Button>
      )
    : canShipOrder
      ? (
          <Button
            variant="contained"
            color="secondary"
            startIcon={<LocalShipping />}
            disabled={!actionsAvailable}
            onClick={() => setShippingDialogOpen(true)}
            size="small"
            fullWidth={true}
          >
            Отправить товар
          </Button>
        )
      : null;

  return (
    <>
      <Stack spacing={0.75}>
        {primaryAction}
        <SellerPaymentReview order={order} available={actionsAvailable} />

        {(secondaryAction || canCancel) && (
          <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
            {canCancel && <Button
              variant="text"
              color="error"
              startIcon={<Cancel />}
              disabled={!actionsAvailable}
              onClick={() => setCancelDialogOpen(true)}
              size="small"
              sx={{ px: 0.5, ...(secondaryAction && { color: "text.secondary" }) }}
            >
              Отменить
            </Button>}
            {secondaryAction}
          </Box>
        )}
      </Stack>

      <ConfirmationDialog
        actionsAvailable={actionsAvailable}
        onRetry={retry}
        retryPending={retryPending}
        open={confirmationAction.isOpen}
        onClose={confirmationAction.close}
        order={order}
        confirmationMutation={confirmationAction.mutation}
      />

      <ShippingDialog
        open={shippingDialogOpen}
        onClose={() => setShippingDialogOpen(false)}
        order={order}
      />

      <CancelOrderDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        order={order}
        userRole="seller"
      />
    </>
  );
};

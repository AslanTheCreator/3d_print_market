"use client";

import React, { useState } from "react";
import { Button, Stack, Box } from "@mui/material";
import { CheckCircle, LocalShipping, Cancel } from "@mui/icons-material";
import { ListOrdersModel, getSellerOrderActionFlags } from "@/entities/order";
import {
  ConfirmationDialog,
  useOrderConfirmationAction,
  useOrderPreOrderConfirmationAction,
} from "@/features/order-confirmation";
import { CancelOrderDialog } from "./CancelOrderDialog";
import ShippingDialog from "./ShippingDialog";

interface SellerActionsProps {
  order: ListOrdersModel;
}

export const SellerActions = ({ order }: SellerActionsProps) => {
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const confirmationAction = useOrderConfirmationAction();
  const preOrderConfirmationAction = useOrderPreOrderConfirmationAction();
  const { canConfirmOrder, canConfirmPreOrder, canShipOrder, canCancel } =
    getSellerOrderActionFlags(order.actualStatus);

  const primaryAction = canConfirmOrder
    ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<CheckCircle />}
          onClick={confirmationAction.open}
          disabled={confirmationAction.mutation.isPending}
          size="small"
          fullWidth={true}
        >
          {confirmationAction.mutation.isPending
            ? "Подтверждение..."
            : "Подтвердить заказ"}
        </Button>
      )
    : canConfirmPreOrder
      ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<CheckCircle />}
            onClick={preOrderConfirmationAction.open}
            disabled={preOrderConfirmationAction.mutation.isPending}
            size="small"
            fullWidth={true}
          >
            {preOrderConfirmationAction.mutation.isPending
              ? "Подтверждение..."
              : "Подтвердить предзаказ"}
          </Button>
        )
      : canShipOrder
        ? (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<LocalShipping />}
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

        {canCancel && (
          <Box>
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
          </Box>
        )}
      </Stack>

      <ConfirmationDialog
        open={confirmationAction.isOpen}
        onClose={confirmationAction.close}
        order={order}
        confirmationType="order"
        confirmationMutation={confirmationAction.mutation}
      />

      <ConfirmationDialog
        open={preOrderConfirmationAction.isOpen}
        onClose={preOrderConfirmationAction.close}
        order={order}
        confirmationType="preorder"
        confirmationMutation={preOrderConfirmationAction.mutation}
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

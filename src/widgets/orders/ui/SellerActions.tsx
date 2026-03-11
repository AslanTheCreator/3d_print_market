"use client";

import React, { useState } from "react";
import { Button, Stack } from "@mui/material";
import { CheckCircle, LocalShipping, Cancel } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order";
import {
  useConfirmOrderBySeller,
  useConfirmPreOrderBySeller,
} from "@/entities/order";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { ConfirmationDialog } from "./ConfirmationDialog";
import ShippingDialog from "./ShippingDialog";

interface SellerActionsProps {
  order: ListOrdersModel;
}

export const SellerActions = ({ order }: SellerActionsProps) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [preOrderConfirmDialogOpen, setPreOrderConfirmDialogOpen] =
    useState(false);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const confirmOrderMutation = useConfirmOrderBySeller();
  const confirmPreOrderMutation = useConfirmPreOrderBySeller();

  const canConfirmOrder = order.actualStatus === "BOOKED";
  const canConfirmPreOrder =
    order.actualStatus === "AWAITING_PREPAYMENT_APPROVAL";
  const canShipOrder = order.actualStatus === "ASSEMBLING";
  const canCancel = !["COMPLETED", "FAILED", "DISPUTED"].includes(
    order.actualStatus,
  );

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {canConfirmOrder && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<CheckCircle />}
            onClick={() => setConfirmDialogOpen(true)}
            disabled={confirmOrderMutation.isPending}
            size="small"
            fullWidth={true}
          >
            {confirmOrderMutation.isPending
              ? "Подтверждение..."
              : "Подтвердить заказ"}
          </Button>
        )}

        {canConfirmPreOrder && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<CheckCircle />}
            onClick={() => setPreOrderConfirmDialogOpen(true)}
            disabled={confirmPreOrderMutation.isPending}
            size="small"
            fullWidth={true}
          >
            {confirmPreOrderMutation.isPending
              ? "Подтверждение..."
              : "Подтвердить предзаказ"}
          </Button>
        )}

        {canShipOrder && (
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
      </Stack>

      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        order={order}
        confirmationType="order"
        confirmationMutation={confirmOrderMutation as any}
      />

      <ConfirmationDialog
        open={preOrderConfirmDialogOpen}
        onClose={() => setPreOrderConfirmDialogOpen(false)}
        order={order}
        confirmationType="preorder"
        confirmationMutation={confirmPreOrderMutation}
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

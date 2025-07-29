"use client";
import React, { useState } from "react";
import { Button, Stack } from "@mui/material";
import { CheckCircle, LocalShipping } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order/model/types";
import {
  useConfirmOrderBySeller,
  useConfirmPreOrderBySeller,
} from "@/entities/order";
import ShippingDialog from "../../send-order-by-seller/ui/ShippingDialog";
import { ConfirmationDialog } from "../../confirm-order-by-seller/ui/ConfirmationDialog";

interface SellerActionsProps {
  order: ListOrdersModel;
}

export const SellerActions = ({ order }: SellerActionsProps) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [preOrderConfirmDialogOpen, setPreOrderConfirmDialogOpen] =
    useState(false);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);

  const confirmOrderMutation = useConfirmOrderBySeller();
  const confirmPreOrderMutation = useConfirmPreOrderBySeller();

  const canConfirmOrder = order.actualStatus === "BOOKED";
  const canConfirmPreOrder =
    order.actualStatus === "AWAITING_PREPAYMENT_APPROVAL";
  const canShipOrder = order.actualStatus === "ASSEMBLING";

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {/* Подтверждение обычного заказа */}
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

        {/* Подтверждение предзаказа */}
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

        {/* Отправка товара */}
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
      </Stack>

      {/* Диалог подтверждения обычного заказа */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        order={order}
        confirmationType="order"
        confirmationMutation={confirmOrderMutation as any} // Пофиксить тип
      />

      {/* Диалог подтверждения предзаказа */}
      <ConfirmationDialog
        open={preOrderConfirmDialogOpen}
        onClose={() => setPreOrderConfirmDialogOpen(false)}
        order={order}
        confirmationType="preorder"
        confirmationMutation={confirmPreOrderMutation}
      />

      {/* Диалог отправки товара */}
      <ShippingDialog
        open={shippingDialogOpen}
        onClose={() => setShippingDialogOpen(false)}
        order={order}
      />
    </>
  );
};

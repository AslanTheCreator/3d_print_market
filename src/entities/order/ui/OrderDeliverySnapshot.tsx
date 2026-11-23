import { Stack, Typography } from "@mui/material";
import { deliveryCarrierLabels, getOrderDeliveryAddress } from "../lib/orderDelivery";
import { getOrderPaymentBreakdown } from "../lib/orderPaymentBreakdown";
import type { ListOrdersModel } from "../model/types";

export function OrderDeliverySnapshot({ order, compact = false }: {
  order: Pick<ListOrdersModel, "deliveryCarrier" | "deliveryAddress" | "transfer" | "calculation" | "termsVersion">;
  compact?: boolean;
}) {
  if (compact && order.deliveryCarrier == null && order.deliveryAddress == null) return null;
  const carrier = order.deliveryCarrier && deliveryCarrierLabels[order.deliveryCarrier];
  const delivery = getOrderPaymentBreakdown(order);
  return (
    <Stack spacing={0.25} sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
      {carrier && <Typography variant="body2">Служба доставки: {carrier}</Typography>}
      {!compact && <Typography variant="caption" color="text.secondary">Адрес</Typography>}
      <Typography variant="body2">{getOrderDeliveryAddress(order)}</Typography>
      {compact && delivery.amounts.deliveryAmount === null && (
        <Typography variant="caption" color="text.secondary">{delivery.deliveryLabel}</Typography>
      )}
    </Stack>
  );
}

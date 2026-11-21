import { Button, Stack, Typography } from "@mui/material";
import { getOrderPaymentBreakdown } from "../lib/orderPaymentBreakdown";
import type { ListOrdersDto } from "../model/types";

type Order = Pick<ListOrdersDto, "calculation" | "termsVersion" | "totalPrice" | "prepaymentAmount"> & { product: Pick<ListOrdersDto["product"], "currency"> };

export function OrderCalculationSummary({ order, onRefresh, refreshDisabled }: {
  order: Order;
  onRefresh?: () => void;
  refreshDisabled?: boolean;
}) {
  const { message, format, legacy, showAmounts, deliveryLabel, prepaymentBlock } = getOrderPaymentBreakdown(order);
  return <Stack spacing={0.5}>
    {message && <Typography role="status">{message}</Typography>}
    {legacy && <>
      {Number.isFinite(order.totalPrice) && <Typography>Стоимость товаров за вычетом предоплаты по старым данным: {order.totalPrice} {order.product.currency}</Typography>}
      {Number.isFinite(order.prepaymentAmount) && <Typography>Предусмотренная предоплата по старым данным: {order.prepaymentAmount} {order.product.currency}</Typography>}
    </>}
    {showAmounts && <>
      <Typography>Товары: {format("goodsAmount") ?? "Нет данных"}</Typography>
      <Typography>Доставка: {deliveryLabel}</Typography>
      <Typography>Итого с доставкой: {format("totalAmount") ?? "Пока неизвестно"}</Typography>
      <Typography>Подтверждено оплачено: {format("confirmedPaidAmount") ?? "Нет данных"}</Typography>
      <Typography>Осталось оплатить: {format("remainingAmount") ?? "Остаток пока неизвестен"}</Typography>
    </>}
    {onRefresh && prepaymentBlock && <Button onClick={onRefresh} disabled={refreshDisabled}>Обновить заказ</Button>}
  </Stack>;
}

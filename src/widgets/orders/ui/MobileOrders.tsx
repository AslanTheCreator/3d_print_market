"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRightRounded } from "@mui/icons-material";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { getOrderStatusActionHint, OrderStatusChip, orderNeedsAttention, type ListOrdersModel } from "@/entities/order";
import { formatPrice } from "@/shared/lib";
import { getOrderPaymentBreakdown } from "@/entities/order";
import { formatOrderDate, type OrdersSortId, type OrdersUserRole } from "../model/dashboardOrders";
import { filterMobileOrders, sortMobileOrders, type MobileOrdersFilterId } from "../model/mobileOrders";
import { CustomerActions } from "./CustomerActions";
import { SellerActions } from "./SellerActions";
import { OrderProductPreview } from "./OrderProductPreview";
import { MobileOrdersControls } from "./MobileOrdersControls";

interface MobileOrdersProps {
  orders: readonly ListOrdersModel[];
  userRole: OrdersUserRole;
  onOpenDetails: (order: ListOrdersModel) => void;
}

export const MobileOrders = ({ orders, userRole, onOpenDetails }: MobileOrdersProps) => {
  const [filter, setFilter] = useState<MobileOrdersFilterId>("all");
  const [sort, setSort] = useState<OrdersSortId>("attention");
  const visibleOrders = useMemo(() => sortMobileOrders(filterMobileOrders(orders, filter, userRole), sort, userRole), [orders, filter, sort, userRole]);
  const isSeller = userRole === "seller";

  if (orders.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, boxShadow: "none" }}>
        <Typography component="h2" variant="h6" gutterBottom>{isSeller ? "Продаж пока нет" : "У вас пока нет покупок"}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          {isSeller ? "Когда покупатель оформит заказ, он появится здесь." : "Здесь появятся ваши заказы и информация об их доставке."}
        </Typography>
        <Button component={Link} href={isSeller ? "/dashboard/products" : "/catalog/search"} variant="contained" fullWidth>
          {isSeller ? "Мои товары" : "Перейти в каталог"}
        </Button>
        {isSeller && <Button component={Link} href="/dashboard/products/new" fullWidth sx={{ mt: 1 }}>Создать товар</Button>}
      </Paper>
    );
  }

  return (
    <Box data-testid="mobile-orders">
      <MobileOrdersControls orders={orders} userRole={userRole} filter={filter} sort={sort} onChange={(nextFilter, nextSort) => { setFilter(nextFilter); setSort(nextSort); }} />
      {visibleOrders.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography component="h2" variant="subtitle1" fontWeight={600}>Заказы не найдены</Typography>
          <Typography variant="body2" color="text.secondary">Для выбранного статуса пока нет заказов.</Typography>
          <Button onClick={() => setFilter("all")} sx={{ mt: 1 }}>Показать все</Button>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {visibleOrders.map((order) => {
            const needsAttention = orderNeedsAttention(order.actualStatus, userRole);
            const hint = getOrderStatusActionHint(order.actualStatus, userRole, order.product.availability === "PREORDER");
            const details = (
              <Button onClick={() => onOpenDetails(order)} aria-label={`Подробнее о заказе №${order.orderId}`} endIcon={<ChevronRightRounded />} sx={{ ml: "auto" }}>Подробнее</Button>
            );
            return (
              <Paper
                component="article"
                aria-label={`Заказ №${order.orderId}`}
                key={order.orderId}
                variant="outlined"
                sx={{ p: 1.5, borderRadius: 2, boxShadow: "none", borderColor: needsAttention ? "primary.main" : "divider" }}
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" flexWrap="wrap" gap={0.75} justifyContent="space-between" alignItems="center">
                    <Box sx={{ maxWidth: "100%", "& .MuiChip-root": { maxWidth: "100%", height: "auto", minHeight: 24 }, "& .MuiChip-label": { whiteSpace: "normal", py: 0.25 } }}>
                      <OrderStatusChip status={order.actualStatus} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">№{order.orderId} · {formatOrderDate(order.createdAt).split(",")[0]}</Typography>
                  </Stack>
                  <OrderProductPreview order={order} userRole={userRole} imageSize={72} showCategory={false} showOrderId={false} nameLines={2} />
                  <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap">
                    <Typography variant="body2" color="text.secondary">Стоимость товаров</Typography>
                    <Typography fontWeight={700}>{formatPrice(getOrderPaymentBreakdown(order).productTotal, order.product.currency)}</Typography>
                  </Stack>
                  {hint && <Typography variant="body2" color={needsAttention ? "text.primary" : "text.secondary"}>{hint}</Typography>}
                  <Box sx={{ "& .MuiButton-root": { minHeight: 44, textTransform: "none", fontSize: 14 }, "& .MuiButton-startIcon": { display: "none" } }}>
                    {isSeller ? <SellerActions order={order} secondaryAction={details} /> : <CustomerActions order={order} secondaryAction={details} />}
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

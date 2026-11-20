"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import {
  getOrderPaymentBreakdown,
  getOrderReviewState,
  OrderProductThumbnail,
  type ListOrdersModel,
} from "@/entities/order";
import {
  getOrderPeerLabel,
  type OrdersUserRole,
} from "../model/dashboardOrders";

interface OrderProductPreviewProps {
  order: ListOrdersModel;
  userRole: OrdersUserRole;
  imageSize?: number;
  showCategory?: boolean;
  showOrderId?: boolean;
  nameLines?: 2 | "all";
  zoomable?: boolean;
}

export const OrderProductPreview = ({
  order,
  userRole,
  imageSize = 64,
  showCategory = true,
  showOrderId = true,
  nameLines,
  zoomable,
}: OrderProductPreviewProps) => {
  const categoryName = order.product.categories?.[0]?.name ?? "Без категории";
  const { quantity } = getOrderPaymentBreakdown(order);

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
      <OrderProductThumbnail image={order.product.image?.[0]} name={order.product.name} size={imageSize} zoomable={zoomable} />

      <Box minWidth={0}>
        {showOrderId && <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          Заказ #{order.orderId}
        </Typography>}

        <Typography
          variant="body2"
          color="text.primary"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: nameLines ? "normal" : "nowrap",
            ...(nameLines && {
              overflowWrap: "anywhere",
              fontWeight: 600,
              fontSize: 16,
              ...(nameLines === 2 && {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }),
            }),
          }}
        >
          {order.product.name}
        </Typography>

        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          flexWrap="wrap"
          sx={{ mt: 0.5 }}
        >
          {showCategory && (
            <Chip
              label={categoryName}
              size="small"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          )}
          <Typography variant="caption" color="text.secondary">
            {getOrderPeerLabel(userRole)}: {order.userInfo.login}
          </Typography>
          <Typography
            data-testid={`order-quantity-${order.orderId}`}
            variant="caption"
            color="text.secondary"
          >
            Количество: {quantity} шт.
          </Typography>
          {getOrderReviewState(order, userRole) === "published" && (
            <Typography variant="caption" color="text.secondary">Отзыв оставлен</Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

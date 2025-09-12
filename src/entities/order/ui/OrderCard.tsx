"use client";
import React from "react";
import { Card, CardContent, Stack, Typography, Divider } from "@mui/material";
import {
  ListOrdersModel,
  UserInfo,
  ProductInfo,
  DeliveryInfo,
} from "@/entities/order";
import { OrderHistory, OrderProgress, OrderStatusChip } from "../";
import { CustomerActions, SellerActions } from "@/features/order";

type UserRole = "seller" | "customer";

interface OrderCardProps {
  order: ListOrdersModel;
  userRole: UserRole;
}

export const OrderCard = ({ order, userRole }: OrderCardProps) => {
  const needsAttention =
    (userRole === "seller" &&
      ["BOOKED", "ASSEMBLING"].includes(order.actualStatus)) ||
    (userRole === "customer" &&
      ["AWAITING_PAYMENT", "ON_THE_WAY"].includes(order.actualStatus));

  return (
    <Card
      sx={{
        mb: 2,
        border: needsAttention ? 2 : 1,
        borderColor: needsAttention ? "warning.main" : "divider",
      }}
    >
      <CardContent>
        {/* Заголовок с номером заказа и статусом */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" fontWeight={600}>
            Заказ #{order.orderId}
          </Typography>
          <OrderStatusChip status={order.actualStatus} />
        </Stack>

        {/* Прогресс заказа */}
        <OrderProgress status={order.actualStatus} userRole={userRole} />

        {/* Информация о пользователе */}
        <UserInfo
          userInfo={order.userInfo}
          userRole={userRole === "seller" ? "customer" : "seller"}
        />

        <Divider sx={{ my: 2 }} />

        {/* Информация о продукте */}
        <ProductInfo product={order.product} />

        <Divider sx={{ my: 2 }} />

        {/* Информация о доставке */}
        <DeliveryInfo transfer={order.transfer} />

        <Divider sx={{ my: 2 }} />

        {/* История заказа */}
        <OrderHistory histories={order.histories} />

        {/* Общая сумма */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          sx={{ mt: 2, mb: 2 }}
        >
          <Typography variant="h6" color="primary.main" fontWeight={700}>
            Итого: {order.totalPrice} {order.product.currency}
          </Typography>
        </Stack>

        {/* Действия в зависимости от роли */}
        {userRole === "seller" ? (
          <SellerActions order={order} />
        ) : (
          <CustomerActions order={order} />
        )}

        {/* Дата создания */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 2, display: "block" }}
        >
          Создан: {new Date(order.createdAt).toLocaleString("ru-RU")}
        </Typography>
      </CardContent>
    </Card>
  );
};

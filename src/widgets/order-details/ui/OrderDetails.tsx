"use client";
import React from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  Divider,
  Stack,
  Alert,
  Skeleton,
} from "@mui/material";
import {
  Phone,
  Email,
  LocationOn,
  ShoppingCart,
  LocalShipping,
  Store,
  AccountCircle,
} from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order/model/types";
import { UseQueryResult } from "@tanstack/react-query";
import { OrderHistory, OrderProgress, OrderStatusChip } from "@/entities/order";
import { CustomerActions, SellerActions } from "@/features/order";

type UserRole = "seller" | "customer";

interface OrderCardProps {
  order: ListOrdersModel;
  userRole: UserRole;
}

interface OrdersPageProps {
  title: string;
  query: UseQueryResult<ListOrdersModel[]>;
  userRole: UserRole;
}

// Компонент для отображения информации о пользователе (продавец или покупатель)
const UserInfo = ({
  userInfo,
  userRole,
  isCurrentUser = false,
}: {
  userInfo: ListOrdersModel["userInfo"];
  userRole: UserRole;
  isCurrentUser?: boolean;
}) => {
  const roleIcon = userRole === "seller" ? <Store /> : <AccountCircle />;
  const roleLabel = userRole === "seller" ? "Продавец" : "Покупатель";

  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
      <Avatar
        sx={{
          bgcolor: userRole === "seller" ? "secondary.main" : "primary.main",
        }}
      >
        {roleIcon}
      </Avatar>
      <Box flex={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" fontWeight={600}>
            {userInfo.login}
          </Typography>
          {isCurrentUser && (
            <Chip
              label="Это вы"
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
          {roleLabel}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Phone sx={{ fontSize: 14 }} />
          <Typography variant="caption" color="text.secondary">
            {userInfo.phoneNumber}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Email sx={{ fontSize: 14 }} />
          <Typography variant="caption" color="text.secondary">
            {userInfo.mail}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
};

// Компонент для отображения информации о продукте
const ProductInfo = ({ product }: { product: ListOrdersModel["product"] }) => (
  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
    <Box
      sx={{
        width: { xs: 60, sm: 80 },
        height: { xs: 60, sm: 80 },
        bgcolor: "grey.100",
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ShoppingCart color="action" />
    </Box>
    <Box flex={1}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {product.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Категория: {product.categories[0].name}
      </Typography>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 0.5, sm: 2 }}
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Typography variant="body2">
          Количество: <strong>{product.count}</strong>
        </Typography>
        <Typography variant="body2" color="primary.main" fontWeight={600}>
          {product.price} {product.currency}
        </Typography>
      </Stack>
    </Box>
  </Stack>
);

// Компонент для отображения информации о доставке
const DeliveryInfo = ({
  transfer,
}: {
  transfer: ListOrdersModel["transfer"];
}) => (
  <Box sx={{ mb: 2 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
      <LocalShipping color="action" />
      <Typography variant="subtitle2" fontWeight={600}>
        Информация о доставке
      </Typography>
    </Stack>
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
      <LocationOn sx={{ fontSize: 16, mt: 0.5 }} color="action" />
      <Typography variant="body2" color="text.secondary">
        {transfer.address}
      </Typography>
    </Stack>
    <Typography variant="body2" color="primary.main" fontWeight={600}>
      Стоимость доставки: {transfer.price} {transfer.currency}
    </Typography>
  </Box>
);

// Основной компонент карточки заказа
const OrderCard = ({ order, userRole }: OrderCardProps) => {
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

// Компонент скелетона для загрузки
const OrderCardSkeleton = () => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Skeleton variant="text" width="40%" height={32} />
        <Skeleton
          variant="rectangular"
          width={120}
          height={24}
          sx={{ borderRadius: 1 }}
        />
      </Stack>
      <Skeleton
        variant="rectangular"
        width="100%"
        height={60}
        sx={{ mb: 2, borderRadius: 1 }}
      />
      <Skeleton
        variant="rectangular"
        width="100%"
        height={80}
        sx={{ mb: 2, borderRadius: 1 }}
      />
      <Skeleton
        variant="rectangular"
        width="100%"
        height={120}
        sx={{ mb: 2, borderRadius: 1 }}
      />
      <Stack direction="row" spacing={1}>
        <Skeleton
          variant="rectangular"
          width={120}
          height={32}
          sx={{ borderRadius: 1 }}
        />
        <Skeleton
          variant="rectangular"
          width={120}
          height={32}
          sx={{ borderRadius: 1 }}
        />
      </Stack>
    </CardContent>
  </Card>
);

// Основной компонент страницы заказов
const OrderDetails = ({ title, query, userRole }: OrdersPageProps) => {
  const { data: orders, isLoading, error } = query;

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>
        {[...Array(3)].map((_, index) => (
          <OrderCardSkeleton key={index} />
        ))}
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Ошибка при загрузке заказов. Попробуйте обновить страницу.
        </Alert>
      </Container>
    );
  }

  const ordersList: ListOrdersModel[] = Array.isArray(orders) ? orders : [];

  // Подсчет заказов, требующих внимания
  const ordersNeedingAttention = ordersList.filter(
    (order) =>
      (userRole === "seller" &&
        ["BOOKED", "ASSEMBLING"].includes(order.actualStatus)) ||
      (userRole === "customer" &&
        ["AWAITING_PAYMENT", "ON_THE_WAY"].includes(order.actualStatus))
  );

  // Сортировка: сначала заказы, требующие внимания, затем по дате создания
  const sortedOrders = [...ordersList].sort((a, b) => {
    const aNeedsAttention = ordersNeedingAttention.includes(a);
    const bNeedsAttention = ordersNeedingAttention.includes(b);

    if (aNeedsAttention && !bNeedsAttention) return -1;
    if (!aNeedsAttention && bNeedsAttention) return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const emptyMessage =
    userRole === "seller"
      ? "У вас пока нет заказов. Когда кто-то купит ваш товар, заказ появится здесь."
      : "У вас пока нет заказов. Ваши покупки будут отображаться здесь.";

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        {title}
      </Typography>

      {ordersList.length === 0 ? (
        <Alert severity="info">{emptyMessage}</Alert>
      ) : (
        <Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              Всего заказов: {ordersList.length}
            </Typography>
            {ordersNeedingAttention.length > 0 && (
              <Chip
                label={`Требует внимания: ${ordersNeedingAttention.length}`}
                color="warning"
                size="small"
                variant="outlined"
              />
            )}
          </Stack>

          {sortedOrders.map((order) => (
            <OrderCard key={order.orderId} order={order} userRole={userRole} />
          ))}
        </Box>
      )}
    </Container>
  );
};

export default OrderDetails;

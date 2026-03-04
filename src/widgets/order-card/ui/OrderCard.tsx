"use client";
import React from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Divider,
  Box,
  useTheme,
  useMediaQuery,
  Collapse,
  IconButton,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import {
  ListOrdersModel,
  OrderHistory,
  OrderStatusChip,
  OrderProgress,
  UserInfo,
  ProductInfo,
  DeliveryInfo,
  PaymentProofImages,
} from "@/entities/order";
import { CustomerActions, SellerActions } from "@/features/order";

type UserRole = "seller" | "customer";

interface OrderCardProps {
  order: ListOrdersModel;
  userRole: UserRole;
}

/**
 * Статусы, при которых покупатель уже загрузил скриншот оплаты
 * и продавцу есть что смотреть.
 */
const STATUSES_WITH_PAYMENT_PROOF = [
  "AWAITING_PREPAYMENT_APPROVAL",
  "AWAITING_PAYMENT",
  "ASSEMBLING",
  "ON_THE_WAY",
  "COMPLETED",
  "DISPUTED",
];

/**
 * Статусы, при которых посылка уже отправлена
 * и покупателю доступна ссылка отслеживания.
 */
const STATUSES_WITH_TRACKING = ["ON_THE_WAY", "COMPLETED"];

export const OrderCard: React.FC<OrderCardProps> = ({ order, userRole }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [expanded, setExpanded] = React.useState(false);

  const isPreorder = order.product.availability === "PREORDER";

  // Проверка на необходимость действия
  const needsAttention =
    (userRole === "seller" &&
      ["BOOKED", "AWAITING_PREPAYMENT_APPROVAL", "ASSEMBLING"].includes(
        order.actualStatus,
      )) ||
    (userRole === "customer" &&
      ["AWAITING_PREPAYMENT", "AWAITING_PAYMENT", "ON_THE_WAY"].includes(
        order.actualStatus,
      ));

  // Фильтрация статусов для не-предзаказов
  const shouldShowProgress = () => {
    if (isPreorder) return true;

    return !["AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL"].includes(
      order.actualStatus,
    );
  };

  // Скриншоты оплаты — только для продавца
  const showPaymentProof =
    userRole === "seller" &&
    order.images.length > 0 &&
    STATUSES_WITH_PAYMENT_PROOF.includes(order.actualStatus);

  // Ссылка отслеживания — только для покупателя, когда посылка отправлена
  const trackingUrl =
    userRole === "customer" &&
    order.deliveryUrl &&
    STATUSES_WITH_TRACKING.includes(order.actualStatus)
      ? order.deliveryUrl
      : undefined;

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: needsAttention ? 2 : 1,
        borderColor: needsAttention ? "warning.main" : "divider",
        boxShadow: needsAttention ? 2 : 0,
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: 1,
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.5, sm: 2 },
          "&:last-child": { pb: { xs: 1.5, sm: 2 } },
        }}
      >
        {/* Шапка */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
          >
            Заказ #{order.orderId}
          </Typography>
          <OrderStatusChip status={order.actualStatus} />
        </Stack>

        {/* Прогресс заказа - скрыт на мобильных */}
        {!isMobile && shouldShowProgress() && (
          <Box sx={{ mb: 2 }}>
            <OrderProgress status={order.actualStatus} userRole={userRole} />
          </Box>
        )}

        {/* Информация о продукте */}
        <ProductInfo product={order.product} />

        {/* Expandable секция */}
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 1.5, mb: expanded ? 1.5 : 0 }}
          >
            <Typography
              variant="h6"
              color="primary.main"
              fontWeight={700}
              sx={{ fontSize: { xs: "1rem", sm: "1.125rem" } }}
            >
              {order.totalPrice} {order.product.currency}
            </Typography>

            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s",
              }}
            >
              <ExpandMore />
            </IconButton>
          </Stack>

          <Collapse in={expanded} timeout="auto">
            <Stack spacing={1.5}>
              <Divider />

              {/* Информация о пользователе */}
              <UserInfo
                userInfo={order.userInfo}
                userRole={userRole === "seller" ? "customer" : "seller"}
              />

              <Divider />

              {/* Информация о доставке + ссылка отслеживания */}
              <DeliveryInfo
                transfer={order.transfer}
                deliveryUrl={trackingUrl}
              />

              {/* Скриншоты оплаты (только для продавца) */}
              {showPaymentProof && (
                <>
                  <Divider />
                  <PaymentProofImages imageIds={order.images} />
                </>
              )}

              <Divider />

              {/* История заказа */}
              <OrderHistory histories={order.histories} />

              <Divider />

              {/* Дата создания */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
              >
                Создан: {new Date(order.createdAt).toLocaleString("ru-RU")}
              </Typography>
            </Stack>
          </Collapse>
        </Box>

        {/* Действия */}
        <Box sx={{ mt: 1.5 }}>
          {userRole === "seller" ? (
            <SellerActions order={order} />
          ) : (
            <CustomerActions order={order} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

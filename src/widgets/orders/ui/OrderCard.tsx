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
  orderNeedsAttention,
  shouldShowOrderProgress,
  shouldShowPaymentProofForRole,
  shouldShowTrackingForRole,
} from "@/entities/order";
import { CustomerActions } from "./CustomerActions";
import { SellerActions } from "./SellerActions";

type UserRole = "seller" | "customer";

interface OrderCardProps {
  order: ListOrdersModel;
  userRole: UserRole;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, userRole }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [expanded, setExpanded] = React.useState(false);

  const isPreorder = order.product.availability === "PREORDER";
  const needsAttention = orderNeedsAttention(order.actualStatus, userRole);
  const showPaymentProof =
    shouldShowPaymentProofForRole(order.actualStatus, userRole) &&
    order.images.length > 0;
  const trackingUrl = shouldShowTrackingForRole(order.actualStatus, userRole)
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
        {!isMobile && shouldShowOrderProgress(order.actualStatus, isPreorder) && (
          <Box sx={{ mb: 2 }}>
            <OrderProgress
              status={order.actualStatus}
              userRole={userRole}
              isPreorder={isPreorder}
            />
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

          <Collapse in={expanded} timeout="auto" mountOnEnter unmountOnExit>
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

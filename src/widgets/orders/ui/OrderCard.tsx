"use client";
import React from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Box,
  Button,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Collapse,
  Paper,
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
  getOrderProgressSteps,
  getOrderStatusActionHint,
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
  const showOrderProgress = shouldShowOrderProgress(
    order.actualStatus,
    isPreorder,
  );
  const trackingUrl = shouldShowTrackingForRole(order.actualStatus, userRole)
    ? order.deliveryUrl
    : undefined;
  const progressSteps = getOrderProgressSteps(isPreorder);
  const currentStepIndex = progressSteps.findIndex(
    (step) => step.key === order.actualStatus,
  );
  const currentStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;
  const progressValue =
    progressSteps.length > 1
      ? ((currentStepNumber - 1) / (progressSteps.length - 1)) * 100
      : 0;
  const actionHint = getOrderStatusActionHint(order.actualStatus, userRole);
  const counterpartyLabel = userRole === "seller" ? "Покупатель" : "Продавец";
  const deliverySummary =
    order.transfer.price === 0
      ? "Бесплатно"
      : `${order.transfer.price} ${order.transfer.currency}`;
  const detailsCardSx = {
    p: 1.25,
    borderRadius: 1.5,
    bgcolor: "grey.50",
  } as const;

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

        {/* Прогресс заказа */}
        {!isMobile && showOrderProgress && (
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

        <Box
          sx={{
            mt: 1.5,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: needsAttention ? "warning.50" : "grey.50",
            border: 1,
            borderColor: needsAttention ? "warning.200" : "divider",
          }}
        >
          <Stack spacing={1}>
            {isMobile && showOrderProgress && (
              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 0.75 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Этап {currentStepNumber} из {progressSteps.length}
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color={needsAttention ? "warning.dark" : "text.primary"}
                  >
                    {progressSteps[Math.max(currentStepIndex, 0)]?.label}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progressValue}
                  color={needsAttention ? "warning" : "primary"}
                  sx={{ height: 6, borderRadius: 999 }}
                />
              </Box>
            )}

            {actionHint && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Следующий шаг
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={needsAttention ? 600 : 500}
                  color={needsAttention ? "warning.dark" : "text.primary"}
                >
                  {actionHint}
                </Typography>
              </Box>
            )}

            {!expanded && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 0.75, sm: 2 }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {counterpartyLabel}
                  </Typography>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {order.userInfo.login}
                  </Typography>
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Доставка
                  </Typography>
                  <Typography variant="body2" noWrap>
                    {deliverySummary}
                  </Typography>
                </Box>
              </Stack>
            )}
          </Stack>
        </Box>

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

            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              endIcon={
                <ExpandMore
                  sx={{
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s",
                  }}
                />
              }
              sx={{
                minWidth: "auto",
                px: 1,
              }}
            >
              {expanded ? "Скрыть" : "Детали"}
            </Button>
          </Stack>

          <Collapse in={expanded} timeout="auto" mountOnEnter unmountOnExit>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <Paper variant="outlined" sx={{ ...detailsCardSx, flex: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1 }}
                  >
                    {counterpartyLabel}
                  </Typography>
                  <UserInfo
                    userInfo={order.userInfo}
                    userRole={userRole === "seller" ? "customer" : "seller"}
                  />
                </Paper>

                <Paper variant="outlined" sx={{ ...detailsCardSx, flex: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1 }}
                  >
                    Доставка
                  </Typography>
                  <DeliveryInfo
                    transfer={order.transfer}
                    deliveryUrl={trackingUrl}
                  />
                </Paper>
              </Stack>

              {/* Скриншоты оплаты (только для продавца) */}
              {showPaymentProof && (
                <Paper variant="outlined" sx={detailsCardSx}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1 }}
                  >
                    Подтверждение оплаты
                  </Typography>
                  <PaymentProofImages imageIds={order.images} />
                </Paper>
              )}

              {/* История заказа */}
              {order.histories.length > 0 && (
                <Paper variant="outlined" sx={detailsCardSx}>
                  <OrderHistory histories={order.histories} />
                </Paper>
              )}
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

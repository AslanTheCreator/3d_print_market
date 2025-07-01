"use client";
import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Divider,
  Stack,
  Alert,
  Skeleton,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Paper,
} from "@mui/material";
import {
  Phone,
  Email,
  LocationOn,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  AccessTime,
  ShoppingCart,
  Person,
  LocalShipping,
  History,
  Payment,
  Receipt,
  Cancel,
  ThumbUp,
  Warning,
  Store,
  AccountCircle,
} from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order/model/types";
import { UseQueryResult } from "@tanstack/react-query";
import ShippingDialog from "@/features/order/send-order-by-seller/ui/ShippingDialog";
import PaymentDialog from "@/features/order/confirm-payment-by-customer/ui/PaymentDialog";
import {
  useConfirmOrderBySeller,
  useConfirmReceiptByCustomer,
} from "@/entities/order";

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

// Компонент для отображения статуса заказа
const OrderStatusChip = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "BOOKED":
        return {
          color: "warning" as const,
          label: "Забронирован",
          icon: <AccessTime sx={{ fontSize: 16 }} />,
        };
      case "AWAITING_PAYMENT":
        return {
          color: "info" as const,
          label: "Ожидает оплату",
          icon: <Payment sx={{ fontSize: 16 }} />,
        };
      case "ASSEMBLING":
        return {
          color: "primary" as const,
          label: "Собирается",
          icon: <ShoppingCart sx={{ fontSize: 16 }} />,
        };
      case "ON_THE_WAY":
        return {
          color: "primary" as const,
          label: "В пути",
          icon: <LocalShipping sx={{ fontSize: 16 }} />,
        };
      case "RECEIVED":
        return {
          color: "success" as const,
          label: "Получен",
          icon: <Receipt sx={{ fontSize: 16 }} />,
        };
      case "COMPLETED":
        return {
          color: "success" as const,
          label: "Завершен",
          icon: <CheckCircle sx={{ fontSize: 16 }} />,
        };
      case "DISPUTED":
        return {
          color: "error" as const,
          label: "Спор",
          icon: <Warning sx={{ fontSize: 16 }} />,
        };
      case "FAILED":
        return {
          color: "error" as const,
          label: "Отменен",
          icon: <Cancel sx={{ fontSize: 16 }} />,
        };
      default:
        return {
          color: "default" as const,
          label: status,
          icon: null,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="filled"
      icon={config.icon ?? undefined}
      sx={{ minWidth: 120 }}
    />
  );
};

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
        Категория: {product.category.name}
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

// Компонент для отображения истории заказа
const OrderHistory = ({
  histories,
}: {
  histories: ListOrdersModel["histories"];
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box>
      <Button
        startIcon={<History />}
        endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
        onClick={() => setExpanded(!expanded)}
        size="small"
        sx={{ mb: 1 }}
      >
        История заказа ({histories.length})
      </Button>
      <Collapse in={expanded}>
        <List dense>
          {histories.map((history, index) => (
            <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckCircle sx={{ fontSize: 16 }} color="success" />
              </ListItemIcon>
              <ListItemText
                primary={history.status}
                secondary={
                  <Stack direction="column" spacing={0.5}>
                    {history.comment && (
                      <Typography variant="caption" color="text.secondary">
                        {history.comment}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(history.changedAt).toLocaleString("ru-RU")}
                    </Typography>
                  </Stack>
                }
                primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  );
};

// Компонент для действий продавца
const SellerActions = ({ order }: { order: ListOrdersModel }) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const confirmOrderMutation = useConfirmOrderBySeller();

  const handleConfirmOrder = () => {
    confirmOrderMutation.mutate(
      {
        orderId: order.orderId,
        accountId: order.userInfo.id,
      },
      {
        onSuccess: () => {
          setConfirmDialogOpen(false);
        },
      }
    );
  };

  const canConfirmOrder = order.actualStatus === "BOOKED";
  const canShipOrder = order.actualStatus === "ASSEMBLING";

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
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

      {/* Диалог подтверждения заказа */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Подтвердить заказ</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите подтвердить заказ #{order.orderId}? После
            подтверждения покупатель сможет перейти к оплате.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            disabled={confirmOrderMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirmOrder}
            variant="contained"
            disabled={confirmOrderMutation.isPending}
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог отправки товара */}
      <ShippingDialog
        open={shippingDialogOpen}
        onClose={() => setShippingDialogOpen(false)}
        order={order}
      />
    </>
  );
};

// Компонент для действий покупателя
const CustomerActions = ({ order }: { order: ListOrdersModel }) => {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const confirmReceiptMutation = useConfirmReceiptByCustomer();

  const handleConfirmReceipt = () => {
    confirmReceiptMutation.mutate(
      {
        orderId: order.orderId,
      },
      {
        onSuccess: () => {
          setReceiptDialogOpen(false);
        },
      }
    );
  };

  const canPay = order.actualStatus === "AWAITING_PAYMENT";
  const canConfirmReceipt = order.actualStatus === "RECEIVED";

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {canPay && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Payment />}
            onClick={() => setPaymentDialogOpen(true)}
            size="small"
            fullWidth={true}
          >
            Подтвердить оплату
          </Button>
        )}

        {canConfirmReceipt && (
          <Button
            variant="contained"
            color="success"
            startIcon={<ThumbUp />}
            onClick={() => setReceiptDialogOpen(true)}
            disabled={confirmReceiptMutation.isPending}
            size="small"
            fullWidth={true}
          >
            {confirmReceiptMutation.isPending
              ? "Подтверждение..."
              : "Подтвердить получение"}
          </Button>
        )}
      </Stack>

      {/* Диалог оплаты */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        order={order}
      />

      {/* Диалог подтверждения получения */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Подтвердить получение заказа</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что получили заказ #{order.orderId} и он соответствует
            описанию? После подтверждения заказ будет считаться завершенным.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setReceiptDialogOpen(false)}
            disabled={confirmReceiptMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirmReceipt}
            variant="contained"
            color="success"
            disabled={confirmReceiptMutation.isPending}
          >
            Подтвердить получение
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Компонент для отображения прогресса заказа
const OrderProgress = ({
  status,
  userRole,
}: {
  status: string;
  userRole: UserRole;
}) => {
  const steps = [
    { key: "BOOKED", label: "Забронирован", sellerAction: true },
    { key: "AWAITING_PAYMENT", label: "Ожидает оплату", customerAction: true },
    { key: "ASSEMBLING", label: "Собирается", sellerAction: true },
    { key: "ON_THE_WAY", label: "В пути", info: true },
    { key: "RECEIVED", label: "Получен", customerAction: true },
    { key: "COMPLETED", label: "Завершен", info: true },
  ];

  const currentStepIndex = steps.findIndex((step) => step.key === status);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
        Прогресс заказа
      </Typography>
      <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          const needsAction =
            isActive &&
            ((step.sellerAction && userRole === "seller") ||
              (step.customerAction && userRole === "customer"));

          return (
            <Box
              key={step.key}
              sx={{
                minWidth: 80,
                textAlign: "center",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: isCompleted
                    ? "success.main"
                    : isActive
                    ? needsAction
                      ? "warning.main"
                      : "primary.main"
                    : "grey.300",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 1,
                }}
              >
                {isCompleted ? (
                  <CheckCircle sx={{ fontSize: 16, color: "white" }} />
                ) : (
                  <Typography variant="caption" color="white" fontWeight={600}>
                    {index + 1}
                  </Typography>
                )}
              </Box>
              <Typography
                variant="caption"
                color={isActive ? "primary.main" : "text.secondary"}
                fontWeight={isActive ? 600 : 400}
                sx={{ display: "block", lineHeight: 1.2 }}
              >
                {step.label}
              </Typography>
              {needsAction && (
                <Typography
                  variant="caption"
                  color="warning.main"
                  fontWeight={600}
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Требует действия
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
};

// Основной компонент карточки заказа
const OrderCard = ({ order, userRole }: OrderCardProps) => {
  const needsAttention =
    (userRole === "seller" &&
      ["BOOKED", "ASSEMBLING"].includes(order.actualStatus)) ||
    (userRole === "customer" &&
      ["AWAITING_PAYMENT", "RECEIVED"].includes(order.actualStatus));

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
        ["AWAITING_PAYMENT", "RECEIVED"].includes(order.actualStatus))
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

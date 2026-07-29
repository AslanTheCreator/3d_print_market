"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  Close,
  EmailOutlined,
  LocalShippingOutlined,
  LocationOnOutlined,
  PersonOutline,
  PhoneOutlined,
} from "@mui/icons-material";
import {
  getOrderPaymentBreakdown,
  OrderStatusChip,
  shouldShowPaymentProofForRole,
  shouldShowTrackingForRole,
  type ListOrdersModel,
} from "@/entities/order";
import { formatPrice } from "@/shared/lib";
import {
  formatOrderDate,
  getOrderPeerLabel,
  type OrdersUserRole,
} from "../model/dashboardOrders";
import {
  CopyableOrderDetail,
  OrderDetailsSection,
} from "./OrderDetailsSection";
import { OrderHistory } from "./OrderHistory";
import { OrderPaymentProof } from "./OrderPaymentProof";
import { OrderProductPreview } from "./OrderProductPreview";
import { OrderTracking } from "./OrderTracking";

interface OrderDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  order: ListOrdersModel;
  userRole: OrdersUserRole;
}

export const OrderDetailsDialog = ({
  open,
  onClose,
  order,
  userRole,
}: OrderDetailsDialogProps) => {
  const peerLabel = getOrderPeerLabel(userRole);
  const showTracking = shouldShowTrackingForRole(
    order.actualStatus,
    userRole,
  );
  const showPaymentProof = shouldShowPaymentProofForRole(
    order.actualStatus,
    userRole,
  );
  const paymentBreakdown = getOrderPaymentBreakdown(order);
  const orderCurrency = order.product.currency;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="order-details-title"
      PaperProps={{
        sx: {
          m: { xs: 0, sm: 4 },
          width: { xs: "100%", sm: "calc(100% - 64px)" },
          maxWidth: { xs: "none", sm: 900 },
          height: { xs: "100%", sm: "auto" },
          maxHeight: { xs: "100%", sm: "calc(100% - 64px)" },
          borderRadius: { xs: 0, sm: 2.5 },
        },
      }}
    >
      <DialogTitle id="order-details-title" sx={{ pr: 7 }}>
        <Stack spacing={0.75}>
          <Typography variant="h6" fontWeight={800}>
            Детали заказа №{order.orderId}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <OrderStatusChip status={order.actualStatus} />
            <Typography variant="caption" color="text.secondary">
              Создан {formatOrderDate(order.createdAt)}
            </Typography>
          </Stack>
        </Stack>
        <IconButton
          onClick={onClose}
          aria-label="Закрыть детали заказа"
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "grey.50" }}>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
            <OrderProductPreview
              order={order}
              userRole={userRole}
              imageSize={84}
            />
            <Divider sx={{ my: 1.5 }} />
            <Stack
              data-testid="order-payment-breakdown"
              spacing={paymentBreakdown.isPreorder ? 1 : 0}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
              >
                <Typography variant="body2" color="text.secondary">
                  {paymentBreakdown.isPreorder
                    ? "Стоимость товаров"
                    : "Сумма заказа"}
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {formatPrice(paymentBreakdown.productTotal, orderCurrency)}
                </Typography>
              </Stack>

              {paymentBreakdown.isPreorder && (
                <>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Предоплата
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatPrice(
                        paymentBreakdown.prepaymentTotal,
                        orderCurrency,
                      )}
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Остаток к оплате
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatPrice(
                        paymentBreakdown.remainingTotal,
                        orderCurrency,
                      )}
                    </Typography>
                  </Stack>
                </>
              )}
            </Stack>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            <OrderDetailsSection
              title="Контакты"
              icon={<PersonOutline />}
              testId="order-contacts"
            >
              <Typography variant="caption" color="text.secondary">
                {peerLabel}
              </Typography>
              <CopyableOrderDetail
                label="Логин"
                value={order.userInfo.login ?? ""}
                icon={<PersonOutline fontSize="small" />}
              />
              <CopyableOrderDetail
                label="Телефон"
                value={order.userInfo.phoneNumber ?? ""}
                icon={<PhoneOutlined fontSize="small" />}
              />
              <CopyableOrderDetail
                label="Email"
                value={order.userInfo.mail ?? ""}
                icon={<EmailOutlined fontSize="small" />}
              />
            </OrderDetailsSection>

            <OrderDetailsSection
              title="Доставка"
              icon={<LocalShippingOutlined />}
              testId="order-delivery"
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <LocationOnOutlined
                  fontSize="small"
                  sx={{ color: "text.secondary", mt: 0.25 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    Адрес
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {order.transfer.address?.trim() || "Не указан"}
                  </Typography>
                </Box>
              </Stack>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Стоимость доставки
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {order.transfer.price === 0
                    ? "Бесплатно"
                    : formatPrice(
                        order.transfer.price,
                        order.transfer.currency,
                      )}
                </Typography>
              </Stack>
            </OrderDetailsSection>
          </Box>

          {showTracking && <OrderTracking deliveryUrl={order.deliveryUrl} />}

          {showPaymentProof && (
            <OrderPaymentProof
              orderId={order.orderId}
              imageIds={order.images}
            />
          )}

          <OrderHistory order={order} />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

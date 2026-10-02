"use client";
import { Button, Divider, Stack, Typography } from "@mui/material";
import { AdminImages } from "@/entities/image";
import {
  getOrderStatusMeta,
  OrderStatusChip,
  type AdminOrderDto,
} from "@/entities/order";
import { AdminOrderActions } from "@/features/admin-order-action";
import { formatDateTime } from "@/shared/lib";
const safeUrl = (value: string) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
};
export function AdminOrderDetail({
  order,
  session,
  locked,
  lockPanel,
  changed,
  close,
}: {
  order: AdminOrderDto;
  session: number | null;
  locked: boolean;
  lockPanel: (value: boolean) => void;
  changed: () => Promise<void>;
  close: () => void;
}) {
  const trackingUrl = safeUrl(order.deliveryUrl);
  return (
    <Stack spacing={2} sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography component="h2" variant="h5">
          Заказ #{order.orderId}
        </Typography>
        <Button disabled={locked} onClick={close}>
          Закрыть
        </Button>
      </Stack>
      <OrderStatusChip status={order.actualStatus} />
      <Typography variant="h6">{order.product.name}</Typography>
      <Typography>Количество: {order.product.count}</Typography>
      <Typography>
        Бот: {order.sellerLogin} (#{order.sellerId})
      </Typography>
      <AdminOrderActions
        order={order}
        session={session}
        changed={changed}
        lockPanel={lockPanel}
      />
      <Divider />
      <Typography variant="h6">Покупатель</Typography>
      <Typography>{order.userInfo.login}</Typography>
      <Typography>{order.userInfo.phoneNumber}</Typography>
      <Typography>{order.userInfo.mail}</Typography>
      <Divider />
      <Typography variant="h6">Оплата</Typography>
      <Typography>
        Стоимость товаров: {order.prepaymentAmount + order.totalPrice}{" "}
        {order.product.currency}
      </Typography>
      <Typography>
        Предоплата: {order.prepaymentAmount} {order.product.currency}
      </Typography>
      <Typography>
        Остаток: {order.totalPrice} {order.product.currency}
      </Typography>
      <Divider />
      <Typography variant="h6">Доставка</Typography>
      <Typography>{order.transfer.address}</Typography>
      <Typography>
        Стоимость доставки: {order.transfer.price} {order.transfer.currency}
      </Typography>
      {trackingUrl && (
        <Button href={trackingUrl} target="_blank" rel="noopener noreferrer">
          Отследить доставку
        </Button>
      )}
      <Divider />
      <Typography variant="h6">Подтверждения оплаты</Typography>
      {order.images.length ? (
        <AdminImages ids={order.images} session={session} />
      ) : (
        <Typography color="text.secondary">Изображений пока нет</Typography>
      )}
      <Divider />
      <Typography variant="h6">История</Typography>
      {order.histories.map((history, index) => (
        <Stack key={`${history.changedAt}-${index}`} spacing={0.5}>
          <Typography fontWeight={600}>
            {getOrderStatusMeta(history.status)?.label ?? history.status}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(history.changedAt)}
          </Typography>
          {history.comment && (
            <Typography sx={{ whiteSpace: "pre-wrap" }}>
              {history.comment}
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

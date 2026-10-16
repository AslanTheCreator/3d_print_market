import { useState } from "react";
import { Alert, Button, Link, Paper, Stack, Typography } from "@mui/material";
import { getOrderCaseImageGroups, OrderCaseCard, type ListOrdersModel, type OrderUserRole } from "@/entities/order";
import { OrderCaseCreate } from "@/features/order-case-create";
import { PaymentDialog, useDisputePayment } from "@/features/order-payment";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import type { useOrderCaseHistory } from "../model/useOrderCaseHistory";
import { OrderImagesSection } from "./OrderImagesSection";
import { useOrderActionsRecovery } from "../model/orderActionsContext";

export function OrderCasesSection({ order, state, userRole }: { order: ListOrdersModel; state: ReturnType<typeof useOrderCaseHistory>; userRole: OrderUserRole }) {
  const { history } = state;
  const recovery = useOrderActionsRecovery();
  // При ошибке чтения не используем прежнюю историю для новых выводов о файлах/чеках.
  const cases = history.isError ? [] : (history.data ?? []);
  const available = history.isSuccess && !history.isFetching && !state.blocked && recovery.actionsAvailable && !recovery.retryPending;
  const payment = useDisputePayment(order, cases, userRole, available);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const images = getOrderCaseImageGroups(order, cases);
  const participants = [
    { id: order.userInfo.id, login: order.userInfo.login },
    { id: order.product.sellerId, login: order.product.sellerLogin },
  ];
  const proofAnchor = (id: number) => `order-${order.orderId}-payment-proof-${id}`;
  return <Stack spacing={2}>
    <OrderImagesSection orderId={order.orderId} imageIds={images.orderImageIds} />
    {images.proofIds.map(id => <OrderImagesSection key={id} id={proofAnchor(id)} orderId={order.orderId} imageIds={[id]} kind="payment" />)}
    <Paper component="section" variant="outlined" data-testid="order-cases" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Typography component="h3" variant="h6" fontWeight={700}>Обращения</Typography>
        <RequestFeedback pending={history.isFetching} error={history.error} retry={() => void history.refetch()} />
        {state.blocked && <Alert severity="warning" action={<Button disabled={state.syncing} onClick={state.retryOrders}>Обновить заказ</Button>}>
          {state.syncError instanceof Error ? state.syncError.message : "Статус заказа изменился. Обновляем заказ; действия временно недоступны."}
        </Alert>}
        {history.isSuccess && !history.isFetching && cases.length === 0 && <Typography>Обращений пока нет.</Typography>}
        {payment.canOpen && <Button variant="outlined" sx={{ minHeight: 44 }} onClick={() => { payment.start(); setPaymentOpen(true); }}>Приложить подтверждение оплаты к спору</Button>}
        <PaymentDialog paymentType="dispute" open={paymentOpen} onClose={() => setPaymentOpen(false)} order={order} action={payment} />
        <OrderCaseCreate key={order.orderId} order={order} userRole={userRole} cases={cases}
          available={available} />
        {!history.isError && cases.map((detail, index) => <OrderCaseCard key={detail.orderCase?.id ?? index} detail={detail} participants={participants}>
          <OrderImagesSection orderId={order.orderId} imageIds={images.cases[index].imageIds} kind="case" />
          {images.cases[index].proofIds.map(id => <Link key={id} href={`#${proofAnchor(id)}`}>Подтверждение оплаты, файл #{id}</Link>)}
        </OrderCaseCard>)}
      </Stack>
    </Paper>
  </Stack>;
}

import { Button, Divider, Stack, Typography } from "@mui/material";
import { AdminImages } from "@/entities/image";
import { getOrderCaseImageGroups, getOrderStatusMeta, OrderCaseCard } from "@/entities/order";
import { AdminOrderCaseForms, useAdminCaseManagement } from "@/features/admin-order-case-management";
import { confirmDiscardChanges } from "@/shared/lib";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { formatCaseAmount } from "../model/formatCaseAmount";

export function AdminCaseDetail({ caseId, session, close }: { caseId: number; session: number | null; close: () => void }) {
  const action = useAdminCaseManagement(caseId, session);
  const { detail } = action;
  const data = detail.data;
  const groups = data ? getOrderCaseImageGroups({ images: data.orderImages ?? [], paymentProofImageId: data.paymentProofImageId }, [data]) : null;
  return <Stack spacing={2} sx={{ p: { xs: 2, md: 3 } }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Typography variant="h5" component="h2">Обращение №{caseId}</Typography>
      <Button disabled={action.state.busy} onClick={() => { if (confirmDiscardChanges()) close(); }}>Закрыть обращение</Button>
    </Stack>
    <RequestFeedback pending={detail.isFetching} error={detail.error} retry={() => void detail.refetch()} />
    {data && <>
      <Typography>Заказ #{data.orderCase?.orderId ?? "не указан"}</Typography>
      <Typography>Покупатель: {data.buyerId != null ? `#${data.buyerId}` : "Не указан"} · Продавец: {data.sellerId != null ? `#${data.sellerId}` : "Не указан"}</Typography>
      <Typography>Текущий статус: {data.orderStatus ? getOrderStatusMeta(data.orderStatus).label : "Не указан"}</Typography>
      <Typography>Предыдущий статус: {data.orderCase?.previousOrderStatus ? getOrderStatusMeta(data.orderCase.previousOrderStatus).label : "Не указан"}</Typography>
      <Typography>Количество: {data.count ?? "Не указано"}</Typography>
      <Typography>Сумма к оплате: {formatCaseAmount(data.totalPrice, data.currency)}</Typography>
      <Typography>Предоплата: {formatCaseAmount(data.prepaymentAmount, data.currency)}</Typography>
      {data.orderCase?.resolvedBy != null && <Typography>Решение принял: участник #{data.orderCase.resolvedBy}</Typography>}
      <OrderCaseCard detail={data} />
      <Divider />
      {groups && <>
        <Typography variant="h6">Файлы заказа</Typography>
        {groups.orderImageIds.length ? <AdminImages session={session} ids={groups.orderImageIds} /> : <Typography>Нет доступных ID файлов заказа.</Typography>}
        <Typography variant="h6">Подтверждение оплаты</Typography>
        {groups.proofIds.length ? groups.proofIds.map(id => <AdminImages key={id} session={session} ids={[id]} />) : <Typography>Подтверждение оплаты не указано в данных обращения.</Typography>}
        <Typography variant="h6">Доказательства обращения</Typography>
        {groups.cases[0].imageIds.length ? <AdminImages session={session} ids={groups.cases[0].imageIds} /> : <Typography>Нет доступных ID доказательств обращения.</Typography>}
      </>}
    </>}
    <AdminOrderCaseForms action={action} />
  </Stack>;
}

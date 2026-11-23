"use client";
import { useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivateScope } from "@/shared/lib/query";
import { formatDateTime } from "@/shared/lib";
import { orderTermsApi } from "../api/orderTermsApi";
import { deliveryEvents } from "../lib/orderTermsHistory";
import { orderQueryKeys } from "../model/queryKeys";
import { adminOrderKeys } from "../model/adminQueries";
import { hasAdminOrderCaseAccess } from "../model/adminOrderCaseQueries";
import { deliveryCarrierLabels } from "../lib/orderDelivery";
import { hasAgentId, type DeliveryHistoryContext } from "../model/orderTerms";

const amount = (value: string | null | undefined, currency?: string | null) =>
  value === undefined ? "Сумма недоступна" : value === null ? "Уточняется" :
    value === "0.00" ? "Бесплатно" : [value, currency].filter(Boolean).join(" ");
const carrier = (code?: string) => Object.entries(deliveryCarrierLabels).find(([id]) => id === code)?.[1] ?? code ?? "Нет данных";

export function OrderDeliveryTermsHistory({ orderId, context, currency }: { orderId: number; context: DeliveryHistoryContext; currency?: string | null }) {
  const scope = usePrivateScope();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: context.role === "admin" ? adminOrderKeys.history(scope.id, context.agentId, orderId) : scope.key(orderQueryKeys.termsHistory(orderId)),
    queryFn: ({ signal }) => {
      if (!scope.isCurrent() || (context.role === "admin" && !hasAdminOrderCaseAccess(client, scope.id))) {
        throw new Error("Доступ к истории не подтверждён");
      }
      return orderTermsApi.history(context, orderId, signal);
    },
    select: deliveryEvents,
    enabled: open && scope.id !== null && (context.role !== "admin" || hasAgentId(context.agentId)), retry: false,
  });
  return <Stack spacing={1}>
    <Button sx={{ minHeight: 44 }} aria-expanded={open} onClick={() => setOpen(!open)}>История условий доставки</Button>
    {open && <>
      {query.isPending && <Typography role="status">Загрузка истории…</Typography>}
      {query.isError && <Alert severity="warning" action={<Button onClick={() => void query.refetch()}>Повторить</Button>}>Не удалось загрузить историю условий</Alert>}
      {query.isSuccess && !query.data.length && <Typography>Изменений доставки пока нет</Typography>}
      {query.data?.map((event, index) => <Stack key={event.id ?? index} sx={{ overflowWrap: "anywhere" }}>
        <Typography fontWeight={600}>Изменение доставки</Typography>
        {event.incomplete && <Typography color="text.secondary">Часть данных события недоступна</Typography>}
        {event.date && Number.isFinite(Date.parse(event.date)) && <Typography>{formatDateTime(event.date)}</Typography>}
        {event.actor !== undefined && <Typography>Автор #{event.actor}</Typography>}
        <Typography>Служба: {carrier(event.before.carrier)} → {carrier(event.after.carrier)}</Typography>
        <Typography>Адрес: {event.before.address ?? "Нет данных"} → {event.after.address ?? "Нет данных"}</Typography>
        <Typography>Стоимость: {amount(event.before.amount, currency)} → {amount(event.after.amount, currency)}</Typography>
        {event.reason && <Typography>Причина: {event.reason}</Typography>}
      </Stack>)}
    </>}
  </Stack>;
}

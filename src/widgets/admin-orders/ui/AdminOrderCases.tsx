"use client";
import { useEffect } from "react";
import { Alert, Button, Drawer, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useAccountSessionKey } from "@/entities/session";
import { useAdminOrderCases } from "@/entities/order";
import { confirmDiscardChanges, formatDateTime, parseNonNegativeSafeInteger, parsePositiveSafeInteger, useUrlState } from "@/shared/lib";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { AdminCaseDetail } from "./AdminCaseDetail";

const kinds: Record<string, string> = { CANCELLATION_REQUEST: "Запрос отмены", DISPUTE: "Спор", PAYMENT_APPEAL: "Обращение об оплате после отмены" };
export function AdminOrderCases() {
  const session = useAccountSessionKey(); const { params, set } = useUrlState();
  const state = params.get("state") === "RESOLVED" ? "RESOLVED" : "OPEN";
  const parsedPage = parseNonNegativeSafeInteger(params.get("page")) ?? 0;
  const page = Number.isSafeInteger(parsedPage * 50) ? parsedPage : 0;
  const selected = parsePositiveSafeInteger(params.get("case"));
  const query = useAdminOrderCases(session, state, page);
  useEffect(() => {
    if ((params.has("page") && params.get("page") !== String(page)) || (params.has("state") && params.get("state") !== state)) set({ state, page });
  }, [params, page, state, set]);
  const change = (values: Record<string, string | number | null>) => { if (confirmDiscardChanges()) set(values); };
  return <Stack spacing={3}>
    <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography component="h1" variant="h4">Обращения по заказам</Typography><Button disabled={query.isFetching} onClick={() => void query.refetch()}>Обновить очередь</Button></Stack>
    <Tabs aria-label="Состояние обращений" value={state} onChange={(_, value: string) => change({ state: value, page: 0, case: null })}>
      <Tab value="OPEN" label="Открытые" /><Tab value="RESOLVED" label="Завершённые" />
    </Tabs>
    <RequestFeedback pending={query.isFetching} error={query.error} retry={() => void query.refetch()} />
    {query.isSuccess && !query.isFetching && !query.data.length && <Alert severity="info">{page ? "На этой странице обращений нет. Вернитесь на предыдущую." : "Обращений в этой выборке нет."}</Alert>}
    {query.data?.map((item, index) => <Paper key={item.caseId ?? index} variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
        <Stack spacing={0.5} flex={1} minWidth={0}>
          <Typography fontWeight={700}>Обращение #{item.caseId ?? "не указан"} · Заказ #{item.orderId ?? "не указан"}</Typography>
          <Typography>{(item.kind && kinds[item.kind]) || "Неизвестный тип обращения"}</Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{item.openingComment || "Причина не указана"}</Typography>
          <Typography variant="body2">Автор: {item.openedBy != null ? `#${item.openedBy}` : "Не указан"} · {item.createdAt ? formatDateTime(item.createdAt) : "Дата не указана"}</Typography>
        </Stack>
        <Button variant="outlined" aria-label={`Открыть обращение #${item.caseId}`} disabled={query.isFetching || !!query.error || !parsePositiveSafeInteger(item.caseId)} onClick={() => change({ case: item.caseId! })}>Открыть</Button>
      </Stack>
    </Paper>)}
    <Stack direction="row" spacing={2} alignItems="center">
      <Button disabled={page === 0 || query.isFetching} onClick={() => change({ page: page - 1, case: null })}>Назад</Button><Typography>Страница {page + 1}</Typography>
      <Button disabled={query.isFetching || !!query.error || (query.data?.length ?? 0) < 50 || !Number.isSafeInteger((page + 1) * 50)} onClick={() => change({ page: page + 1, case: null })}>Далее</Button>
    </Stack>
    <Drawer anchor="right" open={selected !== null} onClose={() => change({ case: null })} PaperProps={{ role: "dialog", "aria-label": `Обращение №${selected}`, sx: { width: { xs: "100%", md: 760 }, maxWidth: "100%", "& .MuiButton-root": { minHeight: 44 } } }}>
      {selected !== null && <AdminCaseDetail key={selected} caseId={selected} session={session} close={() => set({ case: null })} />}
    </Drawer>
  </Stack>;
}

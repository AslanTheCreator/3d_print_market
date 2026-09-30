"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { adminOrderApi, getSellerOrderActionFlags, type AdminOrderAction, type AdminOrderDto } from "@/entities/order";
import { adminAccountsApi } from "@/entities/account";
import { ApiError } from "@/shared/lib/errorHandler";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useUnsavedChanges } from "@/shared/lib";

const labels: Record<AdminOrderAction, string> = { CONFIRM: "Подтвердить заказ", CONFIRM_PREPAYMENT: "Подтвердить предоплату", SHIP: "Отправить", CANCEL: "Отменить заказ" };
const validUrl = (value: string) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };
export function AdminOrderActions({ order, session, changed, lockPanel }: {
  order: AdminOrderDto; session: number | null; changed: () => Promise<void>; lockPanel: (locked: boolean) => void;
}) {
  const flags = getSellerOrderActionFlags(order.actualStatus);
  const [action, setAction] = useState<AdminOrderAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [reconciled, setReconciled] = useState(false);
  const [error, setError] = useState<unknown>();
  const lock = useRef(false);
  const form = useForm<{ comment: string; deliveryUrl: string }>({ defaultValues: { comment: "", deliveryUrl: "" } });
  const accounts = useQuery({ queryKey: ["admin", session, "agent", order.sellerId, "accounts"], queryFn: ({ signal }) => adminAccountsApi.list(order.sellerId, signal), enabled: action === "CONFIRM", retry: false });
  useUnsavedChanges(form.formState.isDirty || busy || unknown);
  useEffect(() => { lockPanel(busy || unknown || form.formState.isDirty); return () => lockPanel(false); }, [busy, unknown, form.formState.isDirty, lockPanel]);
  async function checkResult() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(undefined);
    try {
      const current = await adminOrderApi.find(order.sellerId, order.orderId);
      if (!current || current.actualStatus === order.actualStatus) {
        setError(new Error("Изменение статуса не подтверждено. Повтор действия заблокирован; проверьте результат позже."));
      } else {
        setUnknown(false); setAccepted(true); setReconciled(true); form.reset(); await changed(); setAction(null);
      }
    } catch (cause) { setError(cause); }
    finally { lock.current = false; setBusy(false); }
  }
  async function submit(input: { comment: string; deliveryUrl: string }) {
    if (!action || lock.current || unknown || accepted) return;
    lock.current = true; setBusy(true); setError(undefined);
    let needsCheck = false;
    let written = false;
    try {
      await adminOrderApi.act(order.sellerId, order.orderId, action, { comment: input.comment || undefined, deliveryUrl: action === "SHIP" ? input.deliveryUrl.trim() : undefined });
      written = true;
      setAccepted(true); form.reset();
      await changed(); setAction(null);
    } catch (cause) {
      setError(cause);
      if (!written && cause instanceof ApiError && (!cause.statusCode || cause.code === "TIMEOUT" || cause.code === "NETWORK_ERROR" || cause.statusCode === 408)) { setUnknown(true); needsCheck = true; }
      else if (!written) { try { await changed(); } catch { /* Ошибка чтения отображается родительским списком; введённые данные сохраняются. */ } }
    } finally { lock.current = false; setBusy(false); if (needsCheck) void checkResult(); }
  }
  const actions: AdminOrderAction[] = [];
  if (flags.canConfirmOrder) actions.push("CONFIRM");
  if (flags.canConfirmPreOrder) actions.push("CONFIRM_PREPAYMENT");
  if (flags.canShipOrder) actions.push("SHIP");
  if (flags.canCancel) actions.push("CANCEL");
  const close = () => { if (!busy && !unknown && (!form.formState.isDirty || window.confirm("Отменить введённый комментарий?"))) { setAction(null); form.reset(); } };
  return <Stack spacing={1}>
    {accepted && <Alert severity="success">{reconciled ? "Статус заказа перечитан; повтор действия не отправлялся" : "Действие принято сервером"}</Alert>}
    <Stack direction="row" flexWrap="wrap" gap={1}>{actions.map((item) => <Button key={item} color={item === "CANCEL" ? "error" : "primary"} variant={item === "CANCEL" ? "outlined" : "contained"} disabled={busy || unknown || accepted}
      onClick={() => { setAction(item); setError(undefined); }}>{labels[item]}</Button>)}</Stack>
    <Dialog open={!!action} onClose={close} fullWidth maxWidth="sm"><DialogTitle>{action && labels[action]}</DialogTitle>
      <form onSubmit={form.handleSubmit(submit)}><DialogContent><Stack spacing={2}>
        <RequestFeedback error={error} />
        {accepted && <Alert severity="success" action={<Button onClick={() => void changed().then(() => setAction(null)).catch(setError)}>Обновить список</Button>}>Действие выполнено. Повторная отправка не требуется.</Alert>}
        {unknown && <Alert severity="warning" action={<Button disabled={busy} onClick={() => void checkResult()}>Проверить результат</Button>}>Ответ не получен. Операция могла выполниться.</Alert>}
        {action === "CONFIRM" && <>
          <RequestFeedback pending={accounts.isPending} error={accounts.error} retry={() => void accounts.refetch()} />
          {accounts.data?.length === 0 && <Alert severity="warning">У бота нет реквизитов. <Button href={`/admin/agents/${order.sellerId}?tab=settings`}>Заполнить реквизиты</Button></Alert>}
        </>}
        {action === "CANCEL" && <Alert severity="warning">Отмена заказа не подтверждает возврат денег покупателю.</Alert>}
        <TextField label="Комментарий" multiline minRows={2} {...form.register("comment")} disabled={busy || unknown || accepted} />
        {action === "SHIP" && <TextField label="Ссылка доставки" {...form.register("deliveryUrl", { validate: (value) => action !== "SHIP" || validUrl(value.trim()) || "Укажите полную HTTP/HTTPS-ссылку" })} error={!!form.formState.errors.deliveryUrl} helperText={form.formState.errors.deliveryUrl?.message} disabled={busy || unknown || accepted} />}
      </Stack></DialogContent><DialogActions><Button disabled={busy || unknown} onClick={close}>Закрыть</Button><Button type="submit" variant="contained" disabled={busy || unknown || accepted}>{action && labels[action]}</Button></DialogActions></form>
    </Dialog>
  </Stack>;
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { adminOrderApi, getAdminOrderActionFlags, type AdminOrderAction, type AdminOrderDto } from "@/entities/order";
import { adminAccountsApi } from "@/entities/account";
import { ApiError } from "@/shared/lib/errorHandler";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useUnsavedChanges } from "@/shared/lib";
import { useAdminCancelAction } from "../model/useAdminCancelAction";

const labels: Record<AdminOrderAction, string> = { CONFIRM: "Подтвердить заказ", CONFIRM_PREPAYMENT: "Подтвердить предоплату", SHIP: "Отправить", CANCEL: "Отменить заказ" };
const validUrl = (value: string) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };
export function AdminOrderActions({ order, session, changed, lockPanel }: {
  order: AdminOrderDto; session: number | null; changed: () => Promise<void>; lockPanel: (locked: boolean) => void;
}) {
  const flags = getAdminOrderActionFlags(order.actualStatus);
  const cancel = useAdminCancelAction({ order, session, changed });
  const [action, setAction] = useState<AdminOrderAction | null>(null);
  const [otherBusy, setBusy] = useState(false);
  const [otherUnknown, setUnknown] = useState(false);
  const [otherAccepted, setAccepted] = useState(false);
  const [otherReconciled, setReconciled] = useState(false);
  const [otherError, setError] = useState<unknown>();
  const busy = otherBusy || cancel.busy;
  const unknown = action === "CANCEL" ? cancel.unknown : otherUnknown;
  const accepted = action === "CANCEL" ? cancel.accepted : otherAccepted;
  const error = action === "CANCEL" ? cancel.error : otherError;
  const lock = useRef(false);
  const form = useForm<{ comment: string; deliveryUrl: string }>({ defaultValues: { comment: "", deliveryUrl: "" } });
  // Отправленный комментарий CANCEL уже сохранён в private guard, отдельно от UI формы.
  const hasUnsavedInput = form.formState.isDirty && !(action === "CANCEL" && (cancel.unknown || cancel.accepted));
  const closeBlocked = busy || otherUnknown;
  const formOrder = useRef({ session, agentId: order.sellerId, orderId: order.orderId });
  useEffect(() => {
    const previous = formOrder.current;
    formOrder.current = { session, agentId: order.sellerId, orderId: order.orderId };
    if (action === "CANCEL" && (previous.session !== session || previous.agentId !== order.sellerId || previous.orderId !== order.orderId)) {
      setAction(null); form.reset();
    }
  }, [action, session, order.sellerId, order.orderId, form]);
  const accounts = useQuery({ queryKey: ["admin", session, "agent", order.sellerId, "accounts"], queryFn: ({ signal }) => adminAccountsApi.list(order.sellerId, signal), enabled: action === "CONFIRM", retry: false });
  useUnsavedChanges(hasUnsavedInput || closeBlocked);
  useEffect(() => { lockPanel(closeBlocked || hasUnsavedInput); return () => lockPanel(false); }, [closeBlocked, hasUnsavedInput, lockPanel]);
  async function checkResult(checkCancel = action === "CANCEL") {
    if (checkCancel) {
      if (await cancel.checkResult() && action === "CANCEL") { form.reset(); setAction(null); }
      return;
    }
    if (lock.current || !cancel.canStartOtherAction()) return;
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
    if (action === "CANCEL") {
      if (!lock.current && !otherBusy && !otherUnknown && !otherAccepted && await cancel.submit(input.comment)) { form.reset(); setAction(null); }
      return;
    }
    if (!action || lock.current || otherUnknown || otherAccepted || !cancel.canStartOtherAction()) return;
    const currentFlags = getAdminOrderActionFlags(order.actualStatus);
    const allowed = { CONFIRM: currentFlags.canConfirmOrder, CONFIRM_PREPAYMENT: currentFlags.canConfirmPreOrder, SHIP: currentFlags.canShipOrder, CANCEL: currentFlags.canCancel };
    if (!allowed[action]) { setError(new Error("Статус заказа изменился. Действие недоступно.")); return; }
    lock.current = true; setBusy(true); setError(undefined);
    let needsCheck = false;
    let written = false;
    let attempted = false;
    try {
      const fresh = await adminOrderApi.find(order.sellerId, order.orderId);
      if (!cancel.canStartOtherAction()) return;
      const freshFlags = fresh && getAdminOrderActionFlags(fresh.actualStatus);
      const stillAllowed = freshFlags && { CONFIRM: freshFlags.canConfirmOrder, CONFIRM_PREPAYMENT: freshFlags.canConfirmPreOrder, SHIP: freshFlags.canShipOrder };
      if (!fresh || fresh.orderId !== order.orderId || fresh.sellerId !== order.sellerId || !stillAllowed?.[action]) {
        setError(new Error("Статус или владелец заказа изменился. Действие недоступно; обновите список."));
        await changed();
        return;
      }
      attempted = true;
      await adminOrderApi.act(order.sellerId, order.orderId, action, { comment: input.comment || undefined, deliveryUrl: action === "SHIP" ? input.deliveryUrl.trim() : undefined });
      written = true;
      setAccepted(true); form.reset();
      await changed(); setAction(null);
    } catch (cause) {
      setError(cause);
      if (attempted && !written && cause instanceof ApiError && (!cause.statusCode || cause.code === "TIMEOUT" || cause.code === "NETWORK_ERROR" || cause.statusCode === 408)) { setUnknown(true); needsCheck = true; }
      else if (attempted && !written) { try { await changed(); } catch { /* Ошибка чтения отображается родительским списком; введённые данные сохраняются. */ } }
    } finally { lock.current = false; setBusy(false); if (needsCheck) void checkResult(); }
  }
  const actions: AdminOrderAction[] = [];
  if (flags.canConfirmOrder) actions.push("CONFIRM");
  if (flags.canConfirmPreOrder) actions.push("CONFIRM_PREPAYMENT");
  if (flags.canShipOrder) actions.push("SHIP");
  if (flags.canCancel) actions.push("CANCEL");
  const close = () => { if (!closeBlocked && (!hasUnsavedInput || window.confirm("Отменить введённый комментарий?"))) { setAction(null); form.reset(); } };
  return <Stack spacing={1}>
    {otherAccepted && <Alert severity="success">{otherReconciled ? "Статус заказа перечитан; повтор действия не отправлялся" : "Действие принято сервером"}</Alert>}
    {cancel.accepted && <Alert severity="success" action={action !== "CANCEL" && <Button disabled={busy} onClick={() => void checkResult(true)}>Обновить список</Button>}>{cancel.reconciled ? "Статус заказа перечитан; повтор действия не отправлялся" : "Действие принято сервером"}</Alert>}
    {cancel.busy && action !== "CANCEL" && <Alert severity="info">Отмена заказа выполняется. Повторная отправка заблокирована.</Alert>}
    {cancel.unknown && action !== "CANCEL" && <Alert severity="warning" action={<Button disabled={busy} onClick={() => void checkResult(true)}>Проверить результат</Button>}>{cancel.recoveryMessage || "Ответ не получен. Операция могла выполниться."}</Alert>}
    <Stack direction="row" flexWrap="wrap" gap={1}>{actions.map((item) => <Button key={item} color={item === "CANCEL" ? "error" : "primary"} variant={item === "CANCEL" ? "outlined" : "contained"} disabled={busy || otherUnknown || otherAccepted || (item === "CANCEL" && cancel.accepted)}
      onClick={() => { if (item === "CANCEL") form.reset({ comment: cancel.comment, deliveryUrl: "" }); setAction(item); setError(undefined); }}>{labels[item]}</Button>)}</Stack>
    <Dialog open={!!action} onClose={close} fullWidth maxWidth="sm"><DialogTitle>{action && labels[action]}</DialogTitle>
      <form onSubmit={form.handleSubmit(submit)}><DialogContent><Stack spacing={2}>
        <RequestFeedback error={error} />
        {accepted && <Alert severity="success" action={<Button onClick={() => void changed().then(() => setAction(null)).catch(setError)}>Обновить список</Button>}>Действие выполнено. Повторная отправка не требуется.</Alert>}
        {unknown && <Alert severity="warning" action={<Button disabled={busy} onClick={() => void checkResult()}>Проверить результат</Button>}>Ответ не получен. Операция могла выполниться.{action === "CANCEL" && cancel.recoveryMessage && <div>{cancel.recoveryMessage}</div>}</Alert>}
        {action === "CONFIRM" && <>
          <RequestFeedback pending={accounts.isPending} error={accounts.error} retry={() => void accounts.refetch()} />
          {accounts.data?.length === 0 && <Alert severity="warning">У бота нет реквизитов. <Button component={Link} prefetch={false} href={`/admin/agents/${order.sellerId}?tab=settings`}>Заполнить реквизиты</Button></Alert>}
        </>}
        {action === "CANCEL" && <Alert severity="warning">Отмена заказа не подтверждает возврат денег покупателю.</Alert>}
        <TextField label="Комментарий" multiline minRows={2} {...form.register("comment")} disabled={busy || unknown || accepted} />
        {action === "SHIP" && <TextField label="Ссылка доставки" {...form.register("deliveryUrl", { validate: (value) => action !== "SHIP" || validUrl(value.trim()) || "Укажите полную HTTP/HTTPS-ссылку" })} error={!!form.formState.errors.deliveryUrl} helperText={form.formState.errors.deliveryUrl?.message} disabled={busy || unknown || accepted} />}
      </Stack></DialogContent><DialogActions><Button disabled={closeBlocked} onClick={close}>Закрыть</Button><Button type="submit" variant="contained" disabled={busy || unknown || accepted}>{action && labels[action]}</Button></DialogActions></form>
    </Dialog>
  </Stack>;
}

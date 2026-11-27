"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { OrderCalculationSummary, OrderDeliverySnapshot, type ListOrdersDto, type OrderTermsEvent } from "@/entities/order";
import { FullscreenImageViewer } from "@/shared/ui/image-gallery";
import { reviewTerms, type ReviewDecision } from "../model/reviewEvidence";

export interface PaymentReviewDialogProps {
  order: Pick<ListOrdersDto, "orderId" | "paymentProofImageId" | "actualStatus" | "termsVersion" | "calculation" |
    "deliveryCarrier" | "deliveryAddress" | "transfer" | "userInfo" | "totalPrice" | "prepaymentAmount"> &
    { product: Pick<ListOrdersDto["product"], "sellerId" | "currency"> };
  unavailable?: boolean;
  agentId?: number;
  proof: { id?: number | null; src?: string; fetching: boolean; retry: () => void };
  actions: readonly ("submit" | ReviewDecision["action"])[];
  historyState: string;
  submission?: number;
  busy: boolean;
  blocked: boolean;
  message?: string;
  previousReturn?: Extract<OrderTermsEvent, { kind: "PAYMENT_RETURNED" }>;
  onClose: () => void;
  onCheck: () => void;
  onRefresh: () => Promise<unknown>;
  onSubmit: (action: ReviewDecision["action"], reason: string, snapshot: string, active: () => boolean) => Promise<void>;
}

export function PaymentReviewDialog(props: PaymentReviewDialogProps) {
  const { order, blocked, busy, onClose, message } = props;
  const fingerprint = reviewTerms(order);
  const [refreshError, setRefreshError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [seen, setSeen] = useState(fingerprint);
  const cycle = JSON.stringify([order.orderId, order.actualStatus, order.paymentProofImageId]);
  const [draft, setDraft] = useState({ cycle, submission: props.submission, reason: "" });
  if (!blocked && (draft.cycle !== cycle || (props.submission !== undefined && draft.submission !== props.submission))) {
    setDraft({ cycle, submission: props.submission, reason: "" });
  }
  const sameSubmission = props.submission === undefined || draft.submission === props.submission;
  const reason = draft.cycle === cycle && sameSubmission ? draft.reason : "";
  const setReason = (value: string) => setDraft({
    cycle, submission: props.submission ?? draft.submission, reason: value,
  });
  const proofId = order.paymentProofImageId;
  const prepayment = order.actualStatus === "AWAITING_PREPAYMENT_APPROVAL";
  const reviewing = prepayment || order.actualStatus === "AWAITING_PAYMENT_APPROVAL";
  return <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" sx={{ "& .MuiButton-root": { minHeight: 44 } }}>
    <DialogTitle>Проверка платежа по заказу №{order.orderId}</DialogTitle>
    <DialogContent><Stack spacing={2}>
      {props.agentId !== undefined && <Typography>Агент #{props.agentId}</Typography>}
      {message && <Alert severity={blocked ? "warning" : "info"}>{message}</Alert>}
      {reviewing && props.unavailable && <Alert severity="warning">Обновите данные заказа в выбранном списке агента.</Alert>}
      {reviewing && !props.unavailable && <>
        <Typography variant="h6">{prepayment ? "Предоплата" : "Полная оплата"}</Typography>
        {prepayment && <Typography>Сверьте поступление с согласованной суммой предоплаты.</Typography>}
        {order.calculation ? <OrderCalculationSummary order={order} /> : <Alert severity="warning">Актуальный расчёт не получен</Alert>}
        <OrderDeliverySnapshot order={order} />
        {props.previousReturn && <Typography>Предыдущий возврат чека №{props.previousReturn.imageId}: {props.previousReturn.reason}</Typography>}
        {seen !== fingerprint && <Alert severity="warning" action={<Button disabled={busy || blocked}
          onClick={() => setSeen(fingerprint)}>Проверить новые условия</Button>}>Чек или условия заказа изменились.</Alert>}
        {!blocked && !["current", "legacy"].includes(props.historyState) && <Alert severity="warning">
          Сверка текущего чека с историей не завершена. Обновите данные заказа.
        </Alert>}
        <ReviewForm key={JSON.stringify([fingerprint, props.historyState, props.submission])} {...props} proofId={proofId} snapshot={seen} changed={seen !== fingerprint}
          reason={reason} setReason={setReason} />
      </>}
      {!reviewing && <Typography>Статус заказа изменился.</Typography>}
      {!blocked && reviewing && !props.actions.length && <Button disabled={refreshing} onClick={async () => {
        setRefreshing(true);
        try { await props.onRefresh(); setRefreshError(false); }
        catch { setRefreshError(true); }
        finally { setRefreshing(false); }
      }}>Обновить данные заказа</Button>}
      {refreshError && <Alert severity="warning">Не удалось обновить данные заказа.</Alert>}
      {blocked && !busy && <Button onClick={props.onCheck}>Проверить результат</Button>}
    </Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Закрыть</Button></DialogActions>
  </Dialog>;
}

function ReviewForm({ proof, proofId, snapshot, changed, actions, busy, blocked, reason, setReason, onSubmit }: PaymentReviewDialogProps & {
  proofId?: number | null; snapshot: string; changed: boolean; reason: string; setReason: (value: string) => void;
}) {
  const [receivedSource, setReceivedSource] = useState<string>();
  const [loaded, setLoaded] = useState<string>();
  const [full, setFull] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const src = proof.id === proofId ? proof.src : undefined;
  const img = useRef<HTMLImageElement>(null);
  const displayed = !!src && loaded === src && !proof.fetching;
  const canAct = !changed && !blocked && !busy;
  const canApprove = actions.includes("approve") && displayed && receivedSource === src;
  const canReturn = actions.includes("return") && !!reason.trim() && reason.trim().length <= 500;
  const live = useRef({ canApprove, canReturn, changed, src, snapshot });
  useLayoutEffect(() => {
    live.current = { canApprove, canReturn, changed, src, snapshot };
    return () => { live.current.changed = true; };
  }, [canApprove, canReturn, changed, src, snapshot]);
  const id = useId();
  return <Stack spacing={1.5} component="form" aria-label="Решение по платежу" onSubmit={event => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const action = submitter?.getAttribute("value");
    if (!canAct || (action !== "approve" && action !== "return")) return;
    const active = () => !live.current.changed && live.current.snapshot === snapshot && (action === "return" ?
      live.current.canReturn : live.current.canApprove && live.current.src === src && img.current?.getAttribute("src") === live.current.src && !!img.current?.naturalWidth);
    if (active()) void onSubmit(action, reason, snapshot, active);
  }}>
    {src && <Box component="img" key={imageAttempt} ref={img} src={src} alt={`Текущий чек №${proofId}`}
      onLoad={() => setLoaded(src)} onError={() => { setLoaded(undefined); setReceivedSource(undefined); }}
      sx={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }} />}
    {!proofId ? <Alert severity="warning">Чек отсутствует.</Alert> : <>
      {!displayed && <Typography role="status">{proof.fetching ? "Загрузка чека…" : "Для подтверждения требуется доступное изображение чека."}</Typography>}
      <Stack direction="row" flexWrap="wrap">
        <Button disabled={!displayed} onClick={() => setFull(true)}>Открыть чек</Button>
        <Button disabled={busy || proof.fetching} onClick={() => {
          setLoaded(undefined); setReceivedSource(undefined); setImageAttempt(n => n + 1); proof.retry();
        }}>Перечитать чек</Button>
      </Stack>
    </>}
    {full && displayed && src && <FullscreenImageViewer open onClose={() => setFull(false)}
      alt="Текущий чек" images={[{ originalSrc: src, previewSrc: src, thumbnailSrc: src }]} />}
    <FormControlLabel control={<Checkbox checked={displayed && receivedSource === src} disabled={!canAct || !displayed}
      onChange={event => setReceivedSource(event.target.checked ? src : undefined)} />} label="Я сверил чек и подтверждаю фактическое поступление денег" />
    <Button type="submit" value="approve" variant="contained" disabled={!canAct || !canApprove}>Подтвердить оплату</Button>
    <TextField id={id} label="Причина возврата" value={reason} disabled={busy || blocked} multiline minRows={2}
      error={reason.trim().length > 500} helperText="До 500 символов" onChange={event => setReason(event.target.value)} />
    <Button type="submit" value="return" disabled={!canAct || !canReturn}>Вернуть на повторную оплату</Button>
  </Stack>;
}

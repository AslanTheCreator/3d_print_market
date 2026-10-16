import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import type { ListOrdersModel } from "@/entities/order";
import { createImagePreview, revokeImagePreview, validateImage } from "@/shared/lib";
import type { useDisputePayment } from "../model/useDisputePayment";

export interface DisputePaymentDialogProps {
  paymentType: "dispute";
  open: boolean;
  onClose: () => void;
  order: ListOrdersModel;
  action: ReturnType<typeof useDisputePayment>;
}

export function DisputePaymentDialog({ open, onClose, order, action }: DisputePaymentDialogProps) {
  const { state } = action;
  const input = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const form = useForm({ values: { comment: state.comment } });
  const frozen = state.busy || state.outcome !== "draft";
  useEffect(() => {
    if (!state.file || !open) { setPreview(null); return; }
    const url = createImagePreview(state.file);
    setPreview(url);
    return () => revokeImagePreview(url);
  }, [state.file, open]);
  const close = () => { if (!state.busy) onClose(); };
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="dispute-payment-title">
    <DialogTitle id="dispute-payment-title">Подтверждение оплаты в споре</DialogTitle>
    <DialogContent>
      <Stack component="form" id={`dispute-payment-${order.orderId}`} spacing={2} onSubmit={form.handleSubmit(() => action.submit())} sx={{ pt: 1 }}>
        <Typography>Заказ #{order.orderId}. Приложите чек уже совершённой оплаты к разбирательству. Подтверждение дополняет спор без перехода заказа к сборке.</Typography>
        {state.message && <Alert severity={state.outcome === "accepted" && state.checked ? "success" : "warning"} role="status">{state.message}</Alert>}
        {!action.canSubmit && state.outcome === "draft" && !state.busy && <Alert severity="info">Приложение подтверждения недоступно до загрузки актуального открытого спора из этапа ожидания оплаты.</Alert>}
        {state.outcome !== "draft" && !state.checked && <Button sx={{ minHeight: 44 }} disabled={state.busy} onClick={() => void action.checkResult()}>Проверить подтверждение в споре</Button>}
        <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp" aria-label="Подтверждение оплаты в споре" disabled={frozen || !!state.imageId} style={{ display: "none" }} onChange={event => {
          const file = event.target.files?.[0]; event.target.value = "";
          if (!file) return;
          const validation = validateImage(file);
          setFileError(validation.error ?? "");
          if (validation.isValid) action.setFile(file);
        }} />
        <Button variant="outlined" sx={{ minHeight: 44 }} disabled={frozen || !!state.imageId} onClick={() => input.current?.click()}>Выбрать чек</Button>
        {fileError && <Alert severity="error">{fileError}</Alert>}
        {state.file && <Typography sx={{ overflowWrap: "anywhere" }}>{state.file.name} — {state.imageId ? "загружен" : "выбран"}</Typography>}
        {preview && <Stack alignItems="center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Выбранное подтверждение оплаты в споре" style={{ maxWidth: "100%", maxHeight: 200 }} />
        </Stack>}
        {state.file && !state.imageId && <Button sx={{ minHeight: 44 }} disabled={frozen} onClick={() => action.setFile(null)}>Убрать выбранный чек</Button>}
        <TextField label="Комментарий к подтверждению (необязательно)" multiline minRows={2} disabled={frozen} {...form.register("comment", { onChange: event => action.setComment(event.target.value) })} />
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button sx={{ minHeight: 44 }} onClick={close} disabled={state.busy}>Закрыть</Button>
      <Button sx={{ minHeight: 44 }} variant="contained" type="submit" form={`dispute-payment-${order.orderId}`} disabled={!action.canSubmit || (!state.file && !state.imageId)}>{state.busy ? "Отправка подтверждения…" : "Добавить подтверждение к спору"}</Button>
    </DialogActions>
  </Dialog>;
}

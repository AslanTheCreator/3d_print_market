"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import {
  deliveryCarrierLabels, getDeliveryFieldErrors, hasTermsVersion, normalizeDeliveryAmount,
  type DeliveryCarrier, type TermsOrder,
} from "@/entities/order";
import { allowsDeliveryCost, deliveryBlock, deliveryFingerprint } from "../model/deliveryTermsAttempt";
import { useDeliveryTermsEditor, type EditorProps } from "../model/useDeliveryTermsEditor";

interface Fields { carrier: DeliveryCarrier | ""; address: string; amount: string; unknown: boolean; reason: string }

export function DeliveryTermsEditor(props: EditorProps & { onEditing?: (editing: boolean) => void }) {
  const { order, available, onEditing } = props;
  const { state, check, submit, knownCaseId, pendingReview } = useDeliveryTermsEditor(props);
  const [baseline, setBaseline] = useState<TermsOrder | null>(null);
  const { register, reset, control, handleSubmit, formState: { errors } } = useForm<Fields>({
    defaultValues: { carrier: "", address: "", amount: "", unknown: false, reason: "" },
  });
  const unknown = useWatch({ control, name: "unknown" });
  const selectedCarrier = useWatch({ control, name: "carrier" });
  const stale = baseline && deliveryFingerprint(baseline) !== deliveryFingerprint(order);
  const blocked = deliveryBlock(order);
  const locked = !!state && (state.busy || state.phase !== "idle");
  const canStart = available && !blocked && !knownCaseId && !locked;
  const canSave = (unknownCost: boolean) => canStart && !pendingReview && !stale && allowsDeliveryCost(order, unknownCost);
  function start() {
    setBaseline(order);
    onEditing?.(true);
    reset({ carrier: order.deliveryCarrier ?? "", address: order.deliveryAddress ?? "",
      amount: order.calculation?.deliveryAmount ?? "", unknown: order.calculation?.deliveryAmount === null, reason: "" });
  }
  const save = handleSubmit(async fields => {
    if (!baseline || !canSave(fields.unknown) || !hasTermsVersion(baseline.termsVersion) || !fields.carrier) return;
    const amount = fields.unknown ? null : normalizeDeliveryAmount(fields.amount);
    if (amount === undefined) return;
    const saved = await submit(baseline, { expectedVersion: baseline.termsVersion, carrier: fields.carrier, address: fields.address.trim(),
      deliveryAmount: amount, ...(fields.reason.trim() && { reason: fields.reason.trim() }) });
    if (saved) { setBaseline(null); onEditing?.(false); }
  });
  return <Stack spacing={1} sx={{ "& .MuiButton-root": { minHeight: 44 } }}>
    <Typography variant="caption">Версия условий: {hasTermsVersion(order.termsVersion) ? order.termsVersion : "не получена"}</Typography>
    {pendingReview && <Alert severity="info">Проверка платежа ещё не завершена. После сверки можно сохранить условия доставки.</Alert>}
    {knownCaseId && <Typography>По заказу открыто обращение #{knownCaseId}</Typography>}
    {blocked && <Typography variant="body2">{blocked}</Typography>}
    {state?.message && <Alert severity={state.phase === "idle" && state.message === "Условия доставки обновлены" ? "success" : "info"}>{state.message}</Alert>}
    {state?.readError && <Alert severity="warning">Не удалось подтвердить актуальные условия. {state.readError}</Alert>}
    {(locked || knownCaseId || blocked || !available) && <Button disabled={state?.busy} onClick={() => void check()}>Проверить актуальные условия</Button>}
    {!baseline && <Button disabled={!canStart} onClick={start}>Изменить условия доставки</Button>}
    {baseline && <Stack component="form" onSubmit={save} spacing={1.5} noValidate>
      <Typography>Редактируется версия {baseline.termsVersion}</Typography>
      {stale && <Alert severity="warning">Условия изменились. Ваш черновик сохранён. Актуальные условия показаны в деталях заказа.</Alert>}
      <TextField select label="Служба доставки" value={selectedCarrier} {...register("carrier", {
        validate: value => getDeliveryFieldErrors(value, "адрес").carrier ?? true,
      })} error={!!errors.carrier} helperText={errors.carrier?.message}>
        {Object.entries(deliveryCarrierLabels).map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}
      </TextField>
      <TextField label="Адрес или ПВЗ" multiline {...register("address", { validate: value => getDeliveryFieldErrors("YANDEX", value).address ?? true })}
        error={!!errors.address} helperText={errors.address?.message}/>
      <FormControlLabel sx={{ minHeight: 44 }} control={<Checkbox {...register("unknown")} checked={unknown}/>} label="Стоимость уточняется"/>
      <TextField label={`Стоимость доставки (${baseline.calculation?.currency ?? ""})`} disabled={unknown}
        inputProps={{ inputMode: "decimal" }} {...register("amount", { validate: value => unknown || normalizeDeliveryAmount(value) !== undefined || "Введите неотрицательную сумму с точностью до двух знаков" })}
        error={!!errors.amount} helperText={errors.amount?.message}/>
      <TextField label="Причина изменения" multiline {...register("reason")}/>
      {!allowsDeliveryCost(order, unknown) && <Typography role="status">{order.calculation?.confirmedPaidAmount == null
        ? "Подтверждённая сумма оплаты неизвестна. Укажите стоимость доставки."
        : "После частичной оплаты укажите стоимость доставки"}</Typography>}
      <Button type="submit" variant="contained" disabled={!canSave(unknown)}>Сохранить условия</Button>
      {stale && <Button disabled={!canStart} onClick={start}>Начать с актуальных условий</Button>}
      <Button onClick={() => { setBaseline(null); onEditing?.(false); }}>Закрыть форму</Button>
    </Stack>}
  </Stack>;
}

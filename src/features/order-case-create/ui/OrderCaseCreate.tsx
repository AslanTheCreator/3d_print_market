"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import {
  getAvailableOrderCaseKinds, type ListOrdersModel, type OrderCaseDetail, type OrderCaseKind, type OrderUserRole,
} from "@/entities/order";
import { validateImage } from "@/shared/lib";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useOrderCaseCreate } from "../model/useOrderCaseCreate";

const labels: Record<OrderCaseKind, string> = {
  CANCELLATION_REQUEST: "Запросить отмену",
  DISPUTE: "Открыть спор",
  PAYMENT_APPEAL: "Сообщить об оплате после отмены",
};

interface Props {
  order: ListOrdersModel;
  userRole: OrderUserRole;
  cases: OrderCaseDetail[];
  available: boolean;
}

export function OrderCaseCreate({ order, userRole, cases, available }: Props) {
  const action = useOrderCaseCreate(order.orderId, userRole, available);
  const { state } = action;
  const [fileError, setFileError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useForm<{ comment: string }>({ defaultValues: { comment: state.comment } });
  const kinds = available && action.profile.isSuccess ? getAvailableOrderCaseKinds(order, cases, { userId: action.userId, role: userRole, inOwnList: true }) : [];
  const frozen = state.busy || state.outcome !== "draft";
  const canSubmit = !!state.kind && kinds.includes(state.kind) && !frozen;
  return <Stack spacing={1.5} data-testid="order-case-create">
    <RequestFeedback pending={action.profile.isPending} error={action.profile.error} retry={() => void action.profile.refetch()} />
    {state.message && <Alert severity={state.outcome === "accepted" ? "success" : "warning"} role="status">{state.message}</Alert>}
    {state.outcome !== "draft" && !state.checked && <Button sx={{ minHeight: 44 }} disabled={state.busy} onClick={() => void action.checkResult()}>Проверить результат обращения</Button>}
    {state.outcome === "accepted" && state.checked && <Button sx={{ minHeight: 44 }} disabled={state.busy} onClick={() => { action.finish(); form.reset({ comment: "" }); }}>Завершить</Button>}
    {state.outcome === "draft" && <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      {kinds.map(kind => <Button key={kind} variant={state.kind === kind ? "contained" : "outlined"} sx={{ minHeight: 44 }} disabled={state.busy} onClick={() => action.select(kind)}>{labels[kind]}</Button>)}
    </Stack>}
    {state.kind && <Stack component="form" aria-label={labels[state.kind]} spacing={1.5} onSubmit={form.handleSubmit(({ comment }) => action.submit(comment))}>
      <Typography fontWeight={700}>{labels[state.kind]}</Typography>
      <TextField
        label="Комментарий обращения" multiline minRows={3} fullWidth disabled={frozen}
        error={!!form.formState.errors.comment} helperText={form.formState.errors.comment?.message}
        {...form.register("comment", {
          validate: value => !!value.trim() || "Напишите непустой комментарий",
          onChange: event => action.setComment(event.target.value),
        })}
      />
      {state.kind !== "CANCELLATION_REQUEST" && <>
        <Button variant="outlined" sx={{ minHeight: 44 }} disabled={frozen} onClick={() => fileInput.current?.click()}>Выбрать доказательства</Button>
        <input ref={fileInput} type="file" multiple accept="image/*" aria-label="Доказательства обращения" disabled={frozen} style={{ display: "none" }} onChange={event => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          const invalid = files.map(file => validateImage(file)).find(result => !result.isValid);
          setFileError(invalid?.error ?? "");
          if (!invalid) action.addFiles(files);
        }} />
        <Typography variant="body2" color="text.secondary">Вложения необязательны. Файлы загружаются при отправке; загруженные доказательства сохраняются в заказе.</Typography>
        {fileError && <Alert severity="error">{fileError}</Alert>}
        {state.files.map((item, index) => <Stack key={index} direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography sx={{ overflowWrap: "anywhere", flex: 1 }}>{item.file.name}{item.imageIds ? " — загружен" : " — выбран"}</Typography>
          {!item.imageIds && <Button sx={{ minWidth: 44, minHeight: 44 }} disabled={frozen} aria-label={`Убрать файл ${item.file.name}`} onClick={() => action.removeFile(index)}>Убрать</Button>}
        </Stack>)}
      </>}
      <Button type="submit" variant="contained" sx={{ minHeight: 44 }} disabled={!canSubmit}>{state.busy ? "Отправка обращения…" : "Отправить обращение"}</Button>
      {!canSubmit && state.outcome === "draft" && !state.busy && <Typography variant="body2">Создание временно недоступно. Проверьте актуальный статус заказа и историю обращений.</Typography>}
    </Stack>}
  </Stack>;
}

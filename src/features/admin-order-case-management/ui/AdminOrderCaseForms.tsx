"use client";
import { useForm } from "react-hook-form";
import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { getAdminOrderCaseOutcomes, getSafeCaseTelegramUrl } from "@/entities/order";
import { useUnsavedChanges } from "@/shared/lib";
import type { useAdminCaseManagement } from "../model/useAdminCaseManagement";

const labels = { BUYER: "В пользу покупателя", SELLER: "В пользу продавца", CANCELLED: "Отменить заказ", REJECTED: "Отклонить запрос отмены" };
export function AdminOrderCaseForms({ action }: { action: ReturnType<typeof useAdminCaseManagement> }) {
  const { state, detail } = action;
  const resolution = useForm({ values: { comment: state.comment, outcome: state.outcome } });
  const telegram = useForm({ values: { url: state.url } });
  useUnsavedChanges(action.dirty, state.busy);
  const outcomes = detail.data ? getAdminOrderCaseOutcomes(detail.data) : [];
  const savedTelegram = state.attempt?.kind === "telegram" && state.attempt.status === "accepted" && state.attempt.checked && state.attempt.synced;
  return <Stack spacing={2} data-testid="admin-case-forms">
    {state.message && <Alert role="status" severity={state.attempt?.status === "accepted" && state.attempt.checked && state.attempt.synced ? "success" : "warning"}>{state.message}</Alert>}
    {state.attempt && (!state.attempt.checked || !state.attempt.synced) && <Button disabled={state.busy} onClick={() => void action.checkResult()}>Проверить результат операции</Button>}
    {savedTelegram && <Button onClick={action.continueAfterTelegram}>Продолжить рассмотрение</Button>}
    {state.initialized && <>
      <Typography variant="h6">Обсуждение в Telegram</Typography>
      <Stack component="form" aria-label="Ссылка обсуждения" spacing={1.5} onSubmit={telegram.handleSubmit(() => action.submit("telegram"))}>
        <TextField label="Telegram-ссылка" disabled={!action.canEdit} error={!!telegram.formState.errors.url} helperText={telegram.formState.errors.url?.message}
          {...telegram.register("url", { validate: value => !!getSafeCaseTelegramUrl(value.trim()) || "Укажите HTTPS-ссылку t.me или telegram.me", onChange: event => action.edit({ url: event.target.value }) })} />
        <Button type="submit" variant="outlined" disabled={!action.canEdit || state.url === state.baselineUrl}>Сохранить ссылку обсуждения</Button>
      </Stack>
      <Typography variant="h6">Решение по обращению</Typography>
      {!outcomes.length && <Typography>Новое решение недоступно для этого обращения.</Typography>}
      <Stack component="form" aria-label="Решение обращения" spacing={1.5} onSubmit={resolution.handleSubmit(() => action.submit("resolve"))}>
        <TextField select label="Исход" value={state.outcome} disabled={!action.canEdit || !outcomes.length} error={!!resolution.formState.errors.outcome} helperText={resolution.formState.errors.outcome?.message}
          {...resolution.register("outcome", { validate: value => (!!value && outcomes.includes(value)) || "Выберите допустимый исход", onChange: event => action.edit({ outcome: event.target.value }) })}>
          <MenuItem value="" disabled>Выберите исход</MenuItem>
          {[...new Set([...outcomes, ...(state.outcome ? [state.outcome] : [])])].map(value => <MenuItem key={value} value={value} disabled={!outcomes.includes(value)}>{labels[value]}</MenuItem>)}
        </TextField>
        <TextField label="Комментарий решения" multiline minRows={3} disabled={!action.canEdit} error={!!resolution.formState.errors.comment} helperText={resolution.formState.errors.comment?.message}
          {...resolution.register("comment", { validate: value => !!value.trim() || "Напишите непустой комментарий решения", onChange: event => action.edit({ comment: event.target.value }) })} />
        <Alert severity="info">Возможный возврат средств проводится вручную. Решение обращения не подтверждает возврат денег.</Alert>
        <Button type="submit" variant="contained" disabled={!action.canEdit || !outcomes.length}>{state.busy ? "Обработка обращения…" : "Принять решение"}</Button>
      </Stack>
    </>}
  </Stack>;
}

"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { GiveawaySettingsFields, validateGiveawaySettings, type GiveawaySettingsValues } from "@/entities/product";
import { useUnsavedChanges } from "@/shared/lib";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useAdminGiveawayManagement } from "../model/useAdminGiveawayManagement";

export function AdminGiveawayEditor({ session, id, returnTo }: { session: number | null; id: number; returnTo?: string }) {
  const operation = useAdminGiveawayManagement(session, id);
  return <Stack spacing={2}>
    <RequestFeedback pending={operation.detail.isPending} error={operation.detail.error || operation.agents.error} retry={() => void operation.check()} />
    {operation.detail.data?.product && <>
      <Typography component="h1" variant="h4">{operation.detail.data.product.name || `Розыгрыш #${id}`}</Typography>
      <Typography>Статус товара: {operation.detail.data.product.status ?? "не указан"}</Typography>
      <Typography>Публичный показ: {operation.detail.data.product.giveawayEnabled == null ? "не указан" : operation.detail.data.product.giveawayEnabled ? "включён" : "выключен"}</Typography>
      {typeof operation.detail.data.product.giveawayEnabled !== "boolean" && <Alert severity="warning">Включённость не подтверждена сервером. Сохранение недоступно до успешного чтения полных настроек.</Alert>}
      <Button component="a" href={`/giveaways/${id}`} target="_blank" rel="noopener noreferrer" sx={{ alignSelf: "start" }}>Публичная страница</Button>
      {operation.agents.data?.some(agent => agent.id === operation.detail.data?.product?.participantId) && <Button component={Link} prefetch={false} href={`/admin/products/${id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}>Редактор товара бота</Button>}
    </>}
    {operation.state.initialized && <SettingsForm key={`${session}:${id}`} operation={operation} />}
  </Stack>;
}
function SettingsForm({ operation }: { operation: ReturnType<typeof useAdminGiveawayManagement> }) {
  const { state } = operation;
  const form = useForm<GiveawaySettingsValues>({ defaultValues: state.values });
  const { reset, watch } = form;
  const revision = useRef(state.revision);
  useEffect(() => {
    if (revision.current !== state.revision) { revision.current = state.revision; reset(state.values); }
  }, [state.revision, state.values, reset]);
  useEffect(() => { const subscription = watch(() => operation.edit(form.getValues())); return () => subscription.unsubscribe(); }, [watch, form, operation]);
  useUnsavedChanges(operation.dirty || !!state.attempt, state.busy);
  const blocked = state.busy || !!state.attempt;
  return <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
    <Stack component="form" spacing={3} onSubmit={form.handleSubmit(async values => {
      const errors = validateGiveawaySettings(values);
      for (const [name, message] of Object.entries(errors)) form.setError(name as keyof GiveawaySettingsValues, { message });
      if (!Object.keys(errors).length) await operation.save();
    })}>
      {state.message && <Alert severity={state.attempt || state.conflict || state.readFailed || state.overlap ? "warning" : "info"}>{state.message}</Alert>}
      {operation.otherBlocked && <Alert severity="warning">Операция в редакторе товара ещё не завершена. Проверьте её результат перед новой записью.</Alert>}
      {state.overlap && <Alert severity="error">Период пересекается с другим включённым розыгрышем. Измените даты начала или окончания.</Alert>}
      <GiveawaySettingsFields form={form} disabled={blocked} windowError={state.overlap ? "Период пересекается с другим включённым розыгрышем" : undefined} />
      {state.overlap && <Typography color="error" role="alert">Проверьте даты: GIVEAWAY_WINDOW_OVERLAP</Typography>}
      <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
        <Button type="submit" variant="contained" disabled={!operation.canWrite}>Сохранить настройки</Button>
        <Button disabled={state.busy} onClick={() => void operation.check()}>Проверить актуальные данные</Button>
        <Button disabled={blocked || state.readFailed || !operation.detail.isSuccess || operation.detail.isFetching} onClick={() => {
          if (!operation.dirty || window.confirm("Перечитать форму? Несохранённый ввод будет потерян.")) operation.adopt();
        }}>Перечитать форму</Button>
      </Stack>
    </Stack>
  </Paper>;
}

"use client";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { agentApi, useAgentProfile, type AgentProfileInput } from "@/entities/agent";
import { AdminImages, imageApi } from "@/entities/image";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useUnsavedChanges } from "@/shared/lib";

export function AgentProfileForm({ session, agent }: { session: number | null; agent: number }) {
  const query = useAgentProfile(session, agent);
  return <><RequestFeedback pending={query.isPending} error={query.error} retry={() => void query.refetch()} />
    {query.data && <ProfileForm key={agent} session={session} agent={agent} initial={query.data} reload={async () => { const result = await query.refetch(); if (result.error) throw result.error; }} />}</>;
}
function ProfileForm({ agent, initial, reload, session }: { agent: number; initial: AgentProfileInput; reload: () => Promise<void>; session: number | null }) {
  const form = useForm<AgentProfileInput>({ defaultValues: initial });
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useUnsavedChanges(form.formState.isDirty || busy);
  async function save(input: AgentProfileInput) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(undefined); setSaved(false);
    try {
      const { fullName, phoneNumber, deadlineSending, deadlinePayment, imageId } = input;
      await agentApi.updateProfile(agent, { fullName, phoneNumber, deadlineSending, deadlinePayment, imageId });
      form.reset(input); setSaved(true); await reload();
    } catch (cause) { setError(cause); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}><Stack component="form" spacing={2} onSubmit={form.handleSubmit(save)}>
    <Typography variant="h6">Профиль</Typography>
    <RequestFeedback error={error} retry={saved ? () => void reload().then(() => setError(undefined)).catch(setError) : undefined} />
    {saved && <Alert severity="success">Профиль сохранён</Alert>}
    <TextField label="Имя продавца" {...form.register("fullName")} disabled={busy} />
    <TextField label="Телефон" {...form.register("phoneNumber")} disabled={busy} />
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>{(["deadlineSending", "deadlinePayment"] as const).map((name) => <Controller key={name} name={name} control={form.control}
      rules={{ validate: (value) => Number.isInteger(value) || "Введите целое число" }} render={({ field, fieldState }) => <TextField {...field} type="number" fullWidth disabled={busy}
        label={name === "deadlineSending" ? "Срок отправки" : "Срок оплаты"} error={!!fieldState.error} helperText={fieldState.error?.message}
        onChange={(event) => field.onChange(event.target.value === "" ? "" : Number(event.target.value))} />} />)}</Stack>
    <Typography variant="body2" color="text.secondary">Значения сроков сохраняются в единицах сервера.</Typography>
    <Typography>Изображение профиля: {form.watch("imageId") ?? "не задано"}</Typography>
    <AdminImages ids={form.watch("imageId") ? [form.watch("imageId")!] : []} session={session} />
    <Stack direction="row" spacing={1}><Button component="label" disabled={busy}>Загрузить фото<input hidden type="file" accept="image/*" onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ""; if (!file || lock.current) return;
      lock.current = true; setBusy(true); setError(undefined);
      try { const ids = await imageApi.saveImage(file, "PARTICIPANT"); if (!ids.length) throw new Error("Сервер не вернул изображение"); form.setValue("imageId", ids[0], { shouldDirty: true }); }
      catch (cause) { setError(cause); } finally { lock.current = false; setBusy(false); }
    }} /></Button><Button disabled={busy || form.watch("imageId") === null} onClick={() => form.setValue("imageId", null, { shouldDirty: true })}>Убрать фото</Button></Stack>
    <Button variant="contained" type="submit" disabled={busy || !form.formState.isDirty}>Сохранить профиль</Button>
  </Stack></Paper>;
}

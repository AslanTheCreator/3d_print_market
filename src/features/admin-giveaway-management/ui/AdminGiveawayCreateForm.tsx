"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useCategories } from "@/entities/category";
import { AdminImages } from "@/entities/image";
import { GiveawayProductFields, GiveawaySettingsFields, type GiveawayProductValues, type GiveawaySettingsValues } from "@/entities/product";
import { useGuardedRouter, useUnsavedChanges } from "@/shared/lib";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useAdminGiveawayCreation } from "../model/useAdminGiveawayCreation";

export function AdminGiveawayCreateForm({ session }: { session: number | null }) {
  const operation = useAdminGiveawayCreation(session), { state } = operation;
  const product = useForm<GiveawayProductValues>({ defaultValues: state.product });
  const settings = useForm<GiveawaySettingsValues>({ defaultValues: state.settings });
  const categories = useCategories(), router = useGuardedRouter();
  const revision = useRef(state.revision);
  useEffect(() => {
    if (revision.current !== state.revision) { revision.current = state.revision; product.reset(state.product); settings.reset(state.settings); }
  }, [state.revision, state.product, state.settings, product, settings]);
  useEffect(() => { const subscription = product.watch(() => operation.edit({ product: product.getValues() })); return () => subscription.unsubscribe(); }, [product, operation]);
  useEffect(() => { const subscription = settings.watch(() => operation.edit({ settings: settings.getValues() })); return () => subscription.unsubscribe(); }, [settings, operation]);
  useUnsavedChanges((state.phase === "editing" && operation.dirty) || state.phase === "unknown", state.busy);
  useEffect(() => { if (state.phase === "synced" && !state.busy && operation.allowed) router.replace("/admin/giveaways"); }, [state.phase, state.busy, operation.allowed, router]);
  const blocked = !operation.allowed || state.busy || state.phase !== "editing";
  return <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
    <Stack component="form" spacing={3} onSubmit={product.handleSubmit(() => settings.handleSubmit(() => operation.submit())())}>
      {state.message && <Alert severity={state.phase === "synced" ? "success" : "warning"}>{state.message}</Alert>}
      <Typography>Цена приза — 0. Количество и предоплата для розыгрыша не задаются.</Typography>
      <RequestFeedback pending={categories.isPending} error={categories.error} retry={() => void categories.refetch()} />
      <GiveawayProductFields form={product} categories={categories.data ?? []} disabled={blocked} />
      <Typography component="h2" variant="h6">Настройки розыгрыша</Typography>
      <GiveawaySettingsFields form={settings} disabled={blocked} windowError={state.overlap ? "Период пересекается с другим включённым розыгрышем" : undefined} />
      <Typography component="h2" variant="h6">Изображения приза (необязательно)</Typography>
      <AdminImages ids={state.product.imageIds} session={session} />
      <Stack direction="row" flexWrap="wrap" gap={1}>{state.product.imageIds.map((id, index) => <Button key={`${id}:${index}`} disabled={blocked} onClick={() => product.setValue("imageIds", product.getValues("imageIds").filter((_, i) => i !== index), { shouldDirty: true })}>Убрать фото #{id}</Button>)}</Stack>
      {state.file && <Typography>Выбран файл: {state.file.name}</Typography>}
      {state.uploadError && <Alert severity="error">{state.uploadError}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
        <Button component="label" variant="outlined" disabled={blocked}>Добавить изображение<input type="file" accept="image/*" hidden disabled={blocked} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void operation.upload(file); }} /></Button>
        {state.file && <><Button disabled={blocked} onClick={() => void operation.upload()}>Повторить загрузку изображения</Button><Button disabled={blocked} onClick={operation.discardFile}>Убрать незагруженный файл</Button></>}
      </Stack>
      <Button type="submit" variant="contained" disabled={blocked || !!state.file || !!state.uploadError}>Создать розыгрыш</Button>
      {(state.phase === "accepted" || state.phase === "unknown") && <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
        <Button disabled={state.busy || !operation.allowed} onClick={() => void operation.check()}>{state.phase === "accepted" ? "Обновить данные после создания" : "Проверить историю"}</Button>
        <Button component={Link} href="/admin/giveaways" prefetch={false} disabled={state.busy}>К истории розыгрышей</Button>
      </Stack>}
    </Stack>
  </Paper>;
}

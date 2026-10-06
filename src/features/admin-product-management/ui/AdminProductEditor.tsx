"use client";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useAgents } from "@/entities/agent";
import { useCategories, type CategoryModel } from "@/entities/category";
import { AdminImages, imageApi } from "@/entities/image";
import { adminProductApi, adminProductKeys, mergeAdminProduct, mapAdminProductToInput, productCurrencies, useAdminProduct, useAdminProductRelations, type AdminProductEditorData, type AdminProductInput } from "@/entities/product";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useUnsavedChanges } from "@/shared/lib";
import { ProductStatusActions } from "./ProductStatusActions";

export function AdminProductEditor({ session, id }: { session: number | null; id: number }) {
  const [editing, setEditing] = useState(false);
  const product = useAdminProduct(session, id);
  const agents = useAgents(session);
  const relations = useAdminProductRelations(session, id, !!product.data);
  let editor: AdminProductEditorData | undefined;
  let mergeError: unknown;
  if (product.data && relations.data && !relations.error) {
    try { editor = mergeAdminProduct(product.data, relations.data); } catch (error) { mergeError = error; }
  }
  const owned = !!agents.data?.some((agent) => agent.id === product.data?.participantId);
  if (!Number.isSafeInteger(id) || id <= 0) return <Alert severity="error">Некорректный ID товара</Alert>;
  if (product.data && product.data.id !== id) return <Alert severity="error">Загруженный товар не соответствует ID страницы. Редактирование недоступно.</Alert>;
  return <Stack spacing={2}>
    <RequestFeedback pending={product.isPending || agents.isPending} error={product.error || agents.error} retry={() => { void product.refetch(); void agents.refetch(); }} />
    {product.data && <><Typography component="h1" variant="h4">{product.data.name}</Typography><Typography color="text.secondary">Товар #{id} · Бот #{product.data.participantId}</Typography>
      {!owned && agents.data && <Alert severity="warning">Владелец не входит в список ботов. Редактирование недоступно.</Alert>}
      {owned && <>
        <ProductStatusActions product={product.data} session={session} disabled={editing} />
        <RequestFeedback pending={relations.isPending} error={relations.error || mergeError} retry={() => void relations.refetch()} />
        {(relations.error || mergeError) && <Alert severity="warning">Категории и изображения недоступны. Сохранение заблокировано, чтобы не потерять связи товара.</Alert>}
        {editor && <ProductForm key={id} initial={editor} session={session} onEditing={setEditing} />}
      </>}
    </>}
  </Stack>;
}
const flattenCategories = (items: CategoryModel[], prefix = ""): { id: number; label: string }[] => items.flatMap((item) => [{ id: item.id, label: prefix + item.name }, ...flattenCategories(item.childs ?? [], `${prefix}${item.name} / `)]);
function ProductForm({ initial, session, onEditing }: { initial: AdminProductEditorData; session: number | null; onEditing: (value: boolean) => void }) {
  const { product } = initial;
  const form = useForm<AdminProductInput>({ defaultValues: mapAdminProductToInput(initial) });
  const categories = useCategories();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const [restorePending, setRestorePending] = useState(false);
  const lock = useRef(false);
  useEffect(() => { onEditing(form.formState.isDirty || busy); return () => onEditing(false); }, [form.formState.isDirty, busy, onEditing]);
  useUnsavedChanges(form.formState.isDirty || busy);
  async function restore() {
    await adminProductApi.status(product.id, "ACTIVE"); setRestorePending(false);
  }
  async function save(input: AdminProductInput, activate: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(undefined); setMessage("");
    try {
      await adminProductApi.update(product.participantId, product.id, { ...input, availability: "EXTERNAL_PRODUCT" });
      form.reset(input); setMessage("Изменения сохранены");
      if (activate) { setRestorePending(true); await restore(); setMessage("Изменения сохранены, товар восстановлен"); }
    } catch (cause) { setError(cause); }
    finally { await client.invalidateQueries({ queryKey: adminProductKeys.all(session) }); lock.current = false; setBusy(false); }
  }
  const images = form.watch("imageIds");
  const options = flattenCategories(categories.data ?? []);
  initial.categoryIds.forEach((id) => { if (!options.some((option) => option.id === id)) options.push({ id, label: `Категория #${id}` }); });
  return <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}><Stack component="form" spacing={3} onSubmit={form.handleSubmit((input) => save(input, false))}>
    <RequestFeedback error={error} />{message && <Alert severity="success">{message}</Alert>}
    {restorePending && <Alert severity="warning" action={<Button disabled={busy} onClick={async () => {
      if (lock.current) return; lock.current = true; setBusy(true); setError(undefined);
      try { await restore(); setMessage("Товар восстановлен"); await client.invalidateQueries({ queryKey: adminProductKeys.all(session) }); }
      catch (cause) { setError(cause); } finally { lock.current = false; setBusy(false); }
    }}>Повторить восстановление</Button>}>Изменения сохранены, но восстановление не завершено.</Alert>}
    <TextField label="Название" {...form.register("name", { required: "Введите название" })} disabled={busy} error={!!form.formState.errors.name} helperText={form.formState.errors.name?.message} />
    <TextField label="Описание" {...form.register("description")} multiline minRows={4} disabled={busy} />
    <RequestFeedback pending={categories.isPending} error={categories.error} retry={() => void categories.refetch()} />
    <Controller name="categoryIds" control={form.control} render={({ field }) => <TextField select label="Категории" {...field} SelectProps={{ multiple: true }} disabled={busy || !categories.data}>{options.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}</TextField>} />
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      {(["price", "prepaymentAmount"] as const).map((name) => <Controller key={name} name={name} control={form.control} rules={{ validate: (value) => Number.isFinite(value) || "Введите число" }} render={({ field, fieldState }) => <TextField {...field} fullWidth type="number" inputProps={{ step: "any" }} label={name === "price" ? "Цена" : "Предоплата"} disabled={busy}
        error={!!fieldState.error} helperText={fieldState.error?.message ?? (name === "prepaymentAmount" && field.value === 0 ? "Без предоплаты" : undefined)} onChange={(event) => field.onChange(event.target.value === "" ? "" : Number(event.target.value))} />} />)}
      <Controller name="currency" control={form.control} render={({ field }) => <TextField {...field} select label="Валюта" disabled={busy} sx={{ minWidth: 110 }}>{productCurrencies.map((currency) => <MenuItem key={currency.code} value={currency.code}>{currency.code}</MenuItem>)}</TextField>} />
    </Stack>
    <FormControlLabel control={<Checkbox checked={form.watch("count") === null} disabled={busy} onChange={(_, checked) => form.setValue("count", checked ? null : 0, { shouldDirty: true })} />} label="Без ограничения количества" />
    {form.watch("count") !== null && <Controller name="count" control={form.control} rules={{ validate: (value) => value === null || (Number.isSafeInteger(value) && value >= 0) || "Введите безопасное неотрицательное целое число" }} render={({ field, fieldState }) => <TextField {...field} type="number" label="Остаток" disabled={busy} error={!!fieldState.error} helperText={fieldState.error?.message}
      onChange={(event) => field.onChange(event.target.value === "" ? "" : Number(event.target.value))} />} />}
    <TextField label="Оригинальность" {...form.register("originality")} disabled={busy} />
    <TextField label="Внешняя ссылка" {...form.register("externalUrl", { validate: (value) => !!value.trim() || "Укажите внешнюю ссылку" })} disabled={busy} error={!!form.formState.errors.externalUrl} helperText={form.formState.errors.externalUrl?.message} />
    <Typography variant="h6">Изображения</Typography><AdminImages ids={images} session={session} />
    <Stack direction="row" flexWrap="wrap" gap={1}>{images.map((id) => <Button key={id} disabled={busy} onClick={() => form.setValue("imageIds", images.filter((image) => image !== id), { shouldDirty: true })}>Убрать фото #{id}</Button>)}</Stack>
    <Button component="label" variant="outlined" disabled={busy}>Добавить изображение<input hidden type="file" accept="image/*" onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ""; if (!file || lock.current) return;
      lock.current = true; setBusy(true); setError(undefined);
      try { const ids = await imageApi.saveImage(file, "PRODUCT"); if (!ids.length) throw new Error("Сервер не вернул изображение"); form.setValue("imageIds", [...form.getValues("imageIds"), ...ids], { shouldDirty: true }); }
      catch (cause) { setError(cause); } finally { lock.current = false; setBusy(false); }
    }} /></Button>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ position: "sticky", bottom: 0, bgcolor: "background.paper", py: 2 }}>
      <Button variant="contained" type="submit" disabled={busy}>Сохранить изменения</Button>
      {product.status === "BLOCKED" && !restorePending && <Button variant="outlined" disabled={busy} onClick={form.handleSubmit((input) => save(input, true))}>Сохранить и восстановить</Button>}
    </Stack>
  </Stack></Paper>;
}

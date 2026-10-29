"use client";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Link from "next/link";
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useAgents } from "@/entities/agent";
import { useCategories, type CategoryModel } from "@/entities/category";
import { AdminImages } from "@/entities/image";
import { GiveawaySettingsFields, mergeAdminProduct, productCurrencies, useAdminProduct, useAdminProductRelations, type AdminProductEditorData, type AdminProductInput, type GiveawaySettingsValues } from "@/entities/product";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useUnsavedChanges } from "@/shared/lib";
import { ProductStatusActions } from "./ProductStatusActions";
import { useAdminProductManagement } from "../model/useAdminProductManagement";

export function AdminProductEditor({ session, id, returnTo }: { session: number | null; id: number; returnTo?: string }) {
  const [editing, setEditing] = useState(false);
  const product = useAdminProduct(session, id);
  const agents = useAgents(session);
  const relations = useAdminProductRelations(session, id, !!product.data, product.data?.availability === "GIVEAWAY");
  const baseline = useRef<{ session: number | null; id: number; editor?: AdminProductEditorData }>({ session, id });
  if (baseline.current.session !== session || baseline.current.id !== id) baseline.current = { session, id };
  let editor: AdminProductEditorData | undefined;
  let mergeError: unknown;
  if (product.data && relations.data) {
    try { editor = mergeAdminProduct(product.data, relations.data); baseline.current.editor = editor; } catch (error) { mergeError = error; }
  }
  editor ??= baseline.current.editor;
  const owned = !!agents.data?.some((agent) => agent.id === product.data?.participantId);
  const writesEnabled = !product.error && !agents.error && !relations.error && !mergeError && product.isFetchedAfterMount && relations.isFetchedAfterMount && !product.isFetching && !relations.isFetching;
  if (!Number.isSafeInteger(id) || id <= 0) return <Alert severity="error">Некорректный ID товара</Alert>;
  if (product.data && product.data.id !== id) return <Alert severity="error">Загруженный товар не соответствует ID страницы. Редактирование недоступно.</Alert>;
  if (product.data && product.data.availability !== "GIVEAWAY" && product.data.availability !== "EXTERNAL_PRODUCT") return <Alert severity="warning">Этот тип товара недоступен в редакторе бота.</Alert>;
  return <Stack spacing={2}>
    <RequestFeedback pending={product.isPending || agents.isPending} error={product.error || agents.error} retry={() => { void product.refetch(); void agents.refetch(); }} />
    {product.data && <><Typography component="h1" variant="h4">{product.data.name}</Typography><Typography color="text.secondary">Товар #{id} · Бот #{product.data.participantId}</Typography>
      {!owned && agents.data && <Alert severity="warning" action={<Button disabled={product.isFetching || agents.isFetching} onClick={() => { void product.refetch(); void agents.refetch(); }}>Перепроверить владельца</Button>}>Владелец не входит в список ботов. Редактирование недоступно.</Alert>}
      {owned && <>
        <ProductStatusActions product={product.data} session={session} disabled={editing || !!product.error || !!agents.error || (!!relations.data && !writesEnabled)} />
        <RequestFeedback pending={relations.isPending} error={relations.error || mergeError} retry={() => void relations.refetch()} />
        {(relations.error || mergeError) && <Alert severity="warning">Категории и изображения недоступны. Сохранение заблокировано, чтобы не потерять связи товара.</Alert>}
        {editor && <ProductForm key={`${session}:${id}`} initial={editor} session={session} writesEnabled={writesEnabled} onEditing={setEditing} returnTo={returnTo} />}
      </>}
    </>}
  </Stack>;
}
const flattenCategories = (items: CategoryModel[], prefix = ""): { id: number; label: string }[] => items.flatMap((item) => [{ id: item.id, label: prefix + item.name }, ...flattenCategories(item.childs ?? [], `${prefix}${item.name} / `)]);
function ProductForm({ initial, session, writesEnabled, onEditing, returnTo }: { initial: AdminProductEditorData; session: number | null; writesEnabled: boolean; onEditing: (value: boolean) => void; returnTo?: string }) {
  const operation = useAdminProductManagement(session, initial.product.id, initial, writesEnabled);
  return operation.state.values ? <ProductFields initial={initial} session={session} onEditing={onEditing} operation={operation} returnTo={returnTo} /> : null;
}
function ProductFields({ initial, session, onEditing, operation, returnTo }: { initial: AdminProductEditorData; session: number | null; onEditing: (value: boolean) => void; operation: ReturnType<typeof useAdminProductManagement>; returnTo?: string }) {
  const { product } = initial;
  const { state } = operation;
  const form = useForm<AdminProductInput>({ defaultValues: state.values! });
  const categories = useCategories();
  const revision = useRef(state.revision);
  useEffect(() => { if (revision.current !== state.revision) { revision.current = state.revision; form.reset(state.values!); } }, [state.revision, state.values, form]);
  useEffect(() => { const subscription = form.watch(() => operation.edit(form.getValues())); return () => subscription.unsubscribe(); }, [form, operation]);
  const busy = state.busy || !!state.attempt || operation.otherBlocked;
  const giveaway = form.watch("availability") === "GIVEAWAY";
  useEffect(() => { onEditing(operation.dirty || busy || giveaway); return () => onEditing(false); }, [operation.dirty, busy, giveaway, onEditing]);
  useUnsavedChanges(operation.dirty || !!state.attempt, state.busy);
  const images = form.watch("imageIds");
  const options = flattenCategories(categories.data ?? []);
  initial.categoryIds.forEach((id) => { if (!options.some((option) => option.id === id)) options.push({ id, label: `Категория #${id}` }); });
  return <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}><Stack component="form" spacing={3} onSubmit={form.handleSubmit(() => operation.save())}>
    {state.message && <Alert severity={state.attempt || state.conflict || state.readFailed || state.overlap ? "warning" : "info"}>{state.message}</Alert>}
    {state.restorePending && !state.busy && <Alert severity="warning" action={<Button disabled={busy} onClick={() => void operation.retryRestore()}>Повторить восстановление</Button>}>Изменения сохранены, но восстановление не завершено.</Alert>}
    {operation.otherBlocked && <Alert severity="warning">Операция в редакторе настроек ещё не завершена. Проверьте её результат перед новой записью.</Alert>}
    {giveaway ? <>
      <Alert severity="info">Тип товара: розыгрыш. Обратное преобразование в продажу недоступно.</Alert>
      <Typography>Количество и предоплата для розыгрыша не используются.</Typography>
      <SettingsFields key={state.revision} values={state.values!.availability === "GIVEAWAY" ? state.values!.giveaway : { enabled: true, telegramUrl: "", startAt: "", endAt: "", winnersCount: 1, rules: "", homeText: "" }} disabled={busy} overlap={state.overlap} onChange={values => form.setValue("giveaway", values, { shouldDirty: true })} />
      <Button component={Link} prefetch={false} href={`/admin/giveaways/${product.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}>Настройки розыгрыша</Button>
    </> : <Button variant="outlined" disabled={busy || !operation.canWrite} onClick={operation.convert}>Преобразовать в розыгрыш</Button>}
    <TextField label="Название" {...form.register("name", { required: "Введите название" })} disabled={busy} error={!!form.formState.errors.name} helperText={form.formState.errors.name?.message} />
    <TextField label="Описание" {...form.register("description")} multiline minRows={4} disabled={busy} />
    <RequestFeedback pending={categories.isPending} error={categories.error} retry={() => void categories.refetch()} />
    <Controller name="categoryIds" control={form.control} render={({ field }) => <TextField select label="Категории" {...field} SelectProps={{ multiple: true }} disabled={busy || !categories.data}>{options.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}</TextField>} />
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      {(giveaway ? ["price"] as const : ["price", "prepaymentAmount"] as const).map((name) => <Controller key={name} name={name} control={form.control} rules={{ validate: (value) => Number.isFinite(value) || "Введите число" }} render={({ field, fieldState }) => <TextField {...field} fullWidth type="number" inputProps={{ step: "any" }} label={name === "price" ? "Цена" : "Предоплата"} disabled={busy}
        error={!!fieldState.error} helperText={fieldState.error?.message ?? (name === "prepaymentAmount" && field.value === 0 ? "Без предоплаты" : undefined)} onChange={(event) => field.onChange(event.target.value === "" ? "" : Number(event.target.value))} />} />)}
      <Controller name="currency" control={form.control} render={({ field }) => <TextField {...field} select label="Валюта" disabled={busy} sx={{ minWidth: 110 }}>{field.value === "CREATE" && <MenuItem value="CREATE">CREATE (значение сервера)</MenuItem>}{productCurrencies.map((currency) => <MenuItem key={currency.code} value={currency.code}>{currency.code}</MenuItem>)}</TextField>} />
    </Stack>
    {!giveaway && <><FormControlLabel control={<Checkbox checked={form.watch("count") === null} disabled={busy} onChange={(_, checked) => form.setValue("count", checked ? null : 0, { shouldDirty: true })} />} label="Без ограничения количества" />
    {form.watch("count") !== null && <Controller name="count" control={form.control} rules={{ validate: (value) => value === null || (Number.isSafeInteger(value) && value >= 0) || "Введите безопасное неотрицательное целое число" }} render={({ field, fieldState }) => <TextField {...field} type="number" label="Остаток" disabled={busy} error={!!fieldState.error} helperText={fieldState.error?.message}
      onChange={(event) => field.onChange(event.target.value === "" ? "" : Number(event.target.value))} />} />}</>}
    <TextField label="Оригинальность" {...form.register("originality")} disabled={busy} />
    <TextField label="Внешняя ссылка" {...form.register("externalUrl", { validate: (value) => form.getValues("availability") === "GIVEAWAY" || !!value.trim() || "Укажите внешнюю ссылку" })} disabled={busy} error={!!form.formState.errors.externalUrl} helperText={form.formState.errors.externalUrl?.message} />
    <Typography variant="h6">Изображения</Typography><AdminImages ids={images} session={session} />
    <Stack direction="row" flexWrap="wrap" gap={1}>{images.map((id) => <Button key={id} disabled={busy} onClick={() => form.setValue("imageIds", images.filter((image) => image !== id), { shouldDirty: true })}>Убрать фото #{id}</Button>)}</Stack>
    <Button component="label" variant="outlined" disabled={busy}>Добавить изображение<input hidden type="file" accept="image/*" disabled={busy} onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ""; if (file) await operation.upload(file);
    }} /></Button>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ position: "sticky", bottom: 0, bgcolor: "background.paper", py: 2 }}>
      <Button variant="contained" type="submit" disabled={!operation.canWrite}>Сохранить изменения</Button>
      {!giveaway && product.status === "BLOCKED" && !state.restorePending && <Button variant="outlined" disabled={!operation.canWrite} onClick={form.handleSubmit(() => operation.save(true))}>Сохранить и восстановить</Button>}
      <Button disabled={state.busy} onClick={() => void operation.check()}>Проверить актуальные данные</Button>
      <Button disabled={busy || state.readFailed} onClick={() => { if (!operation.dirty || window.confirm("Перечитать форму? Несохранённый ввод будет потерян.")) operation.adopt(); }}>Перечитать форму</Button>
    </Stack>
  </Stack></Paper>;
}
function SettingsFields({ values, disabled, overlap, onChange }: { values: GiveawaySettingsValues; disabled: boolean; overlap: boolean; onChange: (values: GiveawaySettingsValues) => void }) {
  const form = useForm<GiveawaySettingsValues>({ defaultValues: values });
  useEffect(() => { const subscription = form.watch(() => onChange(form.getValues())); return () => subscription.unsubscribe(); }, [form, onChange]);
  return <GiveawaySettingsFields form={form} disabled={disabled} windowError={overlap ? "Период пересекается с другим включённым розыгрышем" : undefined} />;
}

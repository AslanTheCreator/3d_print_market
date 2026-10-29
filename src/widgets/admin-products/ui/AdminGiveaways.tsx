"use client";
import Link from "next/link";
import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useAccountSessionKey } from "@/entities/session";
import { useAdminGiveawayHistory } from "@/entities/product";
import { GiveawayCreateLink, GiveawayCreationNotice } from "@/features/admin-giveaway-management";
import { parseNonNegativeSafeInteger } from "@/shared/lib";
import { useUrlState } from "@/shared/lib";
import { RequestFeedback } from "@/shared/ui/request-feedback";

export function AdminGiveaways() {
  const session = useAccountSessionKey();
  const { params, set } = useUrlState();
  const page = parseNonNegativeSafeInteger(params.get("page")) ?? 0;
  const history = useAdminGiveawayHistory(session, page);
  return <Stack spacing={3}>
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
      <Typography component="h1" variant="h4">Розыгрыши</Typography>
      <GiveawayCreateLink session={session} />
      <Button disabled={history.isFetching} onClick={() => void history.refetch()}>Обновить историю</Button>
    </Stack>
    <GiveawayCreationNotice session={session} />
    <RequestFeedback pending={history.isPending} error={history.error} retry={() => void history.refetch()} />
    {history.isSuccess && !history.data.length && <Alert severity="info">На этой странице розыгрышей нет</Alert>}
    {history.data?.map(product => <Paper key={product.id} variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography component="h2" variant="h6">{product.name || `Розыгрыш #${product.id}`}</Typography>
        <Typography>#{product.id} · Владелец: {product.participantId ?? "не указан"}</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`Статус товара: ${product.status ?? "не указан"}`} />
          <Chip label={`Публичный показ: ${product.giveawayEnabled == null ? "не указан" : product.giveawayEnabled ? "включён" : "выключен"}`} />
        </Stack>
        <Button component={Link} prefetch={false} href={`/admin/giveaways/${product.id}`} sx={{ alignSelf: "start" }}>Настройки розыгрыша #{product.id}</Button>
      </Stack>
    </Paper>)}
    <Stack direction="row" spacing={2} alignItems="center">
      <Button disabled={page === 0 || history.isFetching} onClick={() => set({ page: page - 1 })}>Назад</Button>
      <Typography>Страница {page + 1}</Typography>
      <Button disabled={!history.isSuccess || history.isFetching || history.data.length < 50} onClick={() => set({ page: page + 1 })}>Далее</Button>
    </Stack>
  </Stack>;
}

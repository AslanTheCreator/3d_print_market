"use client";
import { useAccountSessionKey } from "@/entities/session";
import { useAgents } from "@/entities/agent";
import { useAdminProductLists, useAdminProductRelations, type AdminProductDto } from "@/entities/product";
import { imageApi } from "@/entities/image";
import { useQuery } from "@tanstack/react-query";
import { ProductStatusActions } from "@/features/admin-product-management";
import { Alert, Box, Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useUrlState } from "@/shared/lib";

const statuses: Record<string, string> = { ACTIVE: "Активные", BLOCKED: "Заблокированные", TIME_EXPIRED: "Истёкшие", DELETED: "Удалённые" };
const statusLabels: Record<string, string> = { ACTIVE: "Активен", BLOCKED: "Заблокирован", TIME_EXPIRED: "Истёк", DELETED: "Удалён" };
function ProductPreview({ product, session }: { product: AdminProductDto; session: number | null }) {
  const relations = useAdminProductRelations(session, product.id);
  const matches = relations.data?.id === product.id && relations.data.participantId === product.participantId;
  const imageId = matches ? relations.data?.imageIds?.[0] ?? null : null;
  const metadata = useQuery({ queryKey: ["admin", session, "preview", imageId], queryFn: ({ signal }) => imageApi.getImageMetadata(imageId, signal), enabled: !!imageId, retry: false });
  const url = metadata.data?.[0]?.thumbnailUrl;
  return url ? <Box component="img" src={url} alt="" sx={{ width: 64, height: 64, borderRadius: 2, objectFit: "cover" }} /> : <Box aria-label="Превью недоступно" sx={{ width: 64, height: 64, bgcolor: "grey.100", borderRadius: 2, flexShrink: 0 }} />;
}
export function AdminProducts({ agentId }: { agentId?: number }) {
  const sessionKey = useAccountSessionKey();
  const desktop = useMediaQuery(useTheme().breakpoints.up("md"));
  const agents = useAgents(sessionKey);
  const { params, set, currentUrl } = useUrlState();
  const selected = agentId ?? (Number(params.get("agent")) || undefined);
  const ids = (agents.data ?? []).filter((agent) => !selected || agent.id === selected).map((agent) => agent.id);
  const lists = useAdminProductLists(sessionKey, ids);
  const search = params.get("q") ?? "";
  const status = params.get("status") ?? "ACTIVE";
  const page = Math.max(0, Math.floor(Number(params.get("page")) || 0));
  const products = lists.flatMap((list) => list.data ?? []).filter((item) => (!status || item.status === status) && `${item.id} ${item.name}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  const pageCount = Math.max(1, Math.ceil(products.length / 20));
  const safePage = Math.min(page, pageCount - 1);
  const visible = products.slice(safePage * 20, safePage * 20 + 20);
  const pending = agents.isPending || lists.some((list) => list.isPending);
  const failed = lists.filter((list) => list.error);
  return <Stack spacing={3}><Stack direction="row" justifyContent="space-between"><Typography component={agentId ? "h2" : "h1"} variant="h4">Товары</Typography><Button disabled={pending} onClick={() => lists.forEach((list) => void list.refetch())}>Обновить</Button></Stack>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField label="Поиск по названию или ID" value={search} onChange={(event) => set({ q: event.target.value, page: 0 })} fullWidth />
      {!agentId && <TextField select label="Бот" InputLabelProps={{ shrink: true }} SelectProps={{ displayEmpty: true }} value={selected ?? ""} onChange={(event) => set({ agent: event.target.value || null, page: 0 })} sx={{ minWidth: 180 }}><MenuItem value="">Все боты</MenuItem>{agents.data?.map((agent) => <MenuItem key={agent.id} value={agent.id}>{agent.login}</MenuItem>)}</TextField>}
      <TextField select label="Статус товара" InputLabelProps={{ shrink: true }} SelectProps={{ displayEmpty: true }} value={status} onChange={(event) => set({ status: event.target.value, page: 0 })} sx={{ minWidth: 190 }}><MenuItem value="">Все статусы</MenuItem>{Object.entries(statuses).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
    </Stack>
    <RequestFeedback pending={pending} error={agents.error} retry={() => void agents.refetch()} />
    {!!failed.length && <Alert severity="warning" action={<Button onClick={() => failed.forEach((list) => void list.refetch())}>Повторить</Button>}>Неполная выдача: не загружены товары {failed.length} ботов.</Alert>}
    {!pending && !agents.error && !failed.length && !visible.length && <Alert severity="info">Товары не найдены</Alert>}
    {desktop ? <TableContainer component={Paper} variant="outlined"><Table aria-label="Товары ботов"><TableHead><TableRow>{["Товар", "Бот", "Цена / остаток", "Статус", "Действия"].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{visible.map((product) => <TableRow key={product.id}>
      <TableCell sx={{ maxWidth: 310 }}><Stack direction="row" spacing={1}><ProductPreview product={product} session={sessionKey} /><Stack><Typography fontWeight={600}>{product.name}</Typography><Typography variant="body2" color="text.secondary">#{product.id}</Typography></Stack></Stack></TableCell>
      <TableCell>{agents.data?.find((agent) => agent.id === product.participantId)?.login ?? product.participantId}</TableCell><TableCell>{product.price} {product.currency}<Typography variant="body2">{product.count ?? "Без ограничения"}</Typography></TableCell><TableCell><Chip label={statusLabels[product.status] ?? product.status} /></TableCell>
      <TableCell><Button href={`/admin/products/${product.id}?returnTo=${encodeURIComponent(currentUrl)}`}>Редактировать</Button>{agents.data?.some((agent) => agent.id === product.participantId) && <ProductStatusActions product={product} session={sessionKey} />}</TableCell>
    </TableRow>)}</TableBody></Table></TableContainer> : <Stack spacing={2}>{visible.map((product) => <Paper variant="outlined" key={product.id} sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
        <Stack direction="row" spacing={2} flex={1}><ProductPreview product={product} session={sessionKey} /><Box minWidth={0}><Typography fontWeight={600}>{product.name}</Typography><Typography variant="body2" color="text.secondary">#{product.id} · {agents.data?.find((agent) => agent.id === product.participantId)?.login ?? product.participantId}</Typography><Typography>{product.price} {product.currency} · Остаток: {product.count ?? "без ограничения"}</Typography></Box></Stack>
        <Chip label={statusLabels[product.status] ?? product.status} color={product.status === "ACTIVE" ? "success" : "default"} />
        <Button variant="outlined" href={`/admin/products/${product.id}?returnTo=${encodeURIComponent(currentUrl)}`}>Редактировать</Button>
      </Stack>{agents.data?.some((agent) => agent.id === product.participantId) && <ProductStatusActions product={product} session={sessionKey} />}
    </Paper>)}</Stack>}
    <Stack direction="row" alignItems="center" spacing={2}><Button disabled={safePage === 0} onClick={() => set({ page: safePage - 1 })}>Назад</Button><Typography>Страница {safePage + 1} из {pageCount}</Typography><Button disabled={safePage + 1 >= pageCount} onClick={() => set({ page: safePage + 1 })}>Далее</Button></Stack>
  </Stack>;
}

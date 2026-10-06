"use client";
import { useCallback, useState } from "react";
import { useAccountSessionKey } from "@/entities/session";
import { useAgents } from "@/entities/agent";
import {
  adminOrderKeys,
  adminOrderStatuses,
  getOrderStatusMeta,
  OrderStatusChip,
  useAdminOrders,
  type AdminOrderDto,
  type OrderStatus,
} from "@/entities/order";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Drawer,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useUrlState, formatDateTime, parsePositiveSafeInteger, parseNonNegativeSafeInteger } from "@/shared/lib";
import { AdminOrderDetail } from "./AdminOrderDetail";

export function AdminOrders({ agentId }: { agentId?: number }) {
  const sessionKey = useAccountSessionKey();
  const client = useQueryClient();
  const desktop = useMediaQuery(useTheme().breakpoints.up("md"));
  const agents = useAgents(sessionKey);
  const { params, set } = useUrlState();
  const statusParam = params.get("status") ?? "BOOKED";
  const status = adminOrderStatuses.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : undefined;
  const page = parseNonNegativeSafeInteger(params.get("page")) ?? 0;
  const selectedAgent = parsePositiveSafeInteger(agentId ?? params.get("agent")) ?? undefined;
  const query = useAdminOrders(sessionKey, {
    agentId: selectedAgent,
    status,
    page,
  });
  const [selected, setSelected] = useState<AdminOrderDto | null>(null);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const lockPanel = useCallback((value: boolean) => setLocked(value), []);
  const changed = async () => {
    await client.invalidateQueries({
      queryKey: adminOrderKeys.all(sessionKey),
      refetchType: "none",
    });
    const result = await query.refetch();
    if (result.error) throw result.error;
    const current = result.data?.find(
      (order) => order.orderId === selected?.orderId,
    );
    if (current) setSelected(current);
    else {
      setSelected(null);
      setMessage("Список обновлён: заказ больше не входит в текущую выборку.");
    }
  };
  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between">
        <Typography component={agentId ? "h2" : "h1"} variant="h4">
          Заказы
        </Typography>
        <Button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Обновить
        </Button>
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {[
          ["BOOKED", "Новые"],
          ["AWAITING_PREPAYMENT_APPROVAL", "Предоплата"],
          ["ASSEMBLING", "К отправке"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={status === value ? "contained" : "outlined"}
            onClick={() => set({ status: value, page: 0 })}
          >
            {label}
          </Button>
        ))}
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {!agentId && (
          <TextField
            select
            fullWidth
            label="Бот"
            InputLabelProps={{ shrink: true }}
            SelectProps={{ displayEmpty: true }}
            value={selectedAgent ?? ""}
            onChange={(event) =>
              set({ agent: event.target.value || null, page: 0 })
            }
          >
            <MenuItem value="">Все боты</MenuItem>
            {agents.data?.map((agent) => (
              <MenuItem key={agent.id} value={agent.id}>
                {agent.login}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          select
          fullWidth
          label="Статус заказа"
          InputLabelProps={{ shrink: true }}
          SelectProps={{ displayEmpty: true }}
          value={status ?? ""}
          onChange={(event) => set({ status: event.target.value, page: 0 })}
        >
          <MenuItem value="">Все статусы</MenuItem>
          {adminOrderStatuses.map((value) => (
            <MenuItem key={value} value={value}>
              {getOrderStatusMeta(value).label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <RequestFeedback
        pending={query.isFetching}
        error={query.error || agents.error}
        retry={() => {
          void query.refetch();
          void agents.refetch();
        }}
      />
      {message && (
        <Alert severity="success" onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}
      {query.data?.length === 0 && !query.error && (
        <Alert severity="info">
          {page
            ? "На этой странице заказов нет. Вернитесь на предыдущую."
            : "Заказов с выбранными фильтрами нет"}
        </Alert>
      )}
      {desktop ? (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="Заказы ботов">
            <TableHead>
              <TableRow>
                {["Заказ", "Бот", "Товар", "Сумма", "Статус", "Действия"].map(
                  (label) => (
                    <TableCell key={label}>{label}</TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {query.data?.map((order) => (
                <TableRow
                  key={order.orderId}
                  selected={selected?.orderId === order.orderId}
                >
                  <TableCell>#{order.orderId}</TableCell>
                  <TableCell>{order.sellerLogin}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    {order.product.name}
                    <Typography variant="body2" color="text.secondary">
                      {order.product.count} шт.
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {order.prepaymentAmount + order.totalPrice}{" "}
                    {order.product.currency}
                  </TableCell>
                  <TableCell>
                    <OrderStatusChip status={order.actualStatus} />
                  </TableCell>
                  <TableCell>
                    <Button
                      disabled={query.isFetching || !!query.error}
                      onClick={() => setSelected(order)}
                      aria-label={`Открыть заказ #${order.orderId}`}
                    >
                      Открыть
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={2}>
          {query.data?.map((order) => (
            <Paper key={order.orderId} variant="outlined" sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ md: "center" }}
              >
                <Stack flex={1} minWidth={0}>
                  <Typography fontWeight={600}>
                    Заказ #{order.orderId} · {order.product.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.sellerLogin} · {formatDateTime(order.createdAt)}
                  </Typography>
                  <Typography>
                    {order.product.count} шт. ·{" "}
                    {order.prepaymentAmount + order.totalPrice}{" "}
                    {order.product.currency}
                  </Typography>
                </Stack>
                <OrderStatusChip status={order.actualStatus} />
                <Button
                  variant="outlined"
                  disabled={query.isFetching || !!query.error}
                  onClick={() => setSelected(order)}
                >
                  Открыть заказ #{order.orderId}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <Stack direction="row" alignItems="center" spacing={2}>
        <Button
          disabled={page === 0 || query.isFetching}
          onClick={() => set({ page: page - 1 })}
        >
          Назад
        </Button>
        <Typography>Страница {page + 1}</Typography>
        <Button
          disabled={
            query.isFetching ||
            !query.data ||
            query.data.length < 50 ||
            !!query.error
          }
          onClick={() => set({ page: page + 1 })}
        >
          Далее
        </Button>
      </Stack>
      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => !locked && setSelected(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: 620 },
            maxWidth: "100%",
            "& .MuiButton-root": { minHeight: 44 },
          },
          role: "dialog",
          "aria-label": "Детали заказа",
        }}
      >
        {selected && (
          <AdminOrderDetail
            key={`${selected.orderId}-${selected.actualStatus}`}
            order={selected}
            session={sessionKey}
            locked={locked}
            lockPanel={lockPanel}
            changed={changed}
            close={() => setSelected(null)}
          />
        )}
      </Drawer>
    </Stack>
  );
}

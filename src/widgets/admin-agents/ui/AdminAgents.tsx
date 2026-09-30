"use client";
import { useAccountSessionKey } from "@/entities/session";
import { useAgents } from "@/entities/agent";
import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { RequestFeedback } from "@/shared/ui/request-feedback";
export function AdminAgents() {
  const sessionKey = useAccountSessionKey();
  const query = useAgents(sessionKey);
  return <Stack spacing={3}><Typography component="h1" variant="h4">Боты</Typography><Typography color="text.secondary">Продавцы, публикующие товары из Telegram</Typography>
    <RequestFeedback pending={query.isFetching} error={query.error} retry={() => void query.refetch()} />
    {query.data?.length === 0 && <Alert severity="info">Ботов пока нет</Alert>}
    {query.data?.map((agent) => <Paper key={agent.id} variant="outlined" sx={{ p: 3 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
      <Stack flex={1}><Typography variant="h6">{agent.login}</Typography><Typography color="text.secondary">ID {agent.id}</Typography></Stack>
      <Chip label={agent.status === "ACTIVE" ? "Активен" : agent.status === "BLOCKED" ? "Заблокирован" : agent.status} color={agent.status === "ACTIVE" ? "success" : "default"} />
      <Button href={`/admin/agents/${agent.id}`} variant="outlined">Открыть бота</Button>
    </Stack></Paper>)}
  </Stack>;
}

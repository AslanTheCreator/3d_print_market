"use client";
import { type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useAccountSessionKey } from "@/entities/session";
import { useAgentProfile } from "@/entities/agent";
import { AgentSettings } from "@/features/admin-agent-settings";
import { RequestFeedback } from "@/shared/ui/request-feedback";
export function AdminAgentDetails({
  agent,
  orders,
  products,
}: {
  agent: number;
  orders: ReactNode;
  products: ReactNode;
}) {
  const sessionKey = useAccountSessionKey();
  const params = useSearchParams();
  const tab = params.get("tab") ?? "orders";
  const query = useAgentProfile(sessionKey, agent);
  if (!Number.isSafeInteger(agent) || agent <= 0)
    return <Alert severity="error">Некорректный ID бота</Alert>;
  return (
    <Stack spacing={3}>
      <Button href="/admin/agents" sx={{ alignSelf: "start" }}>
        ← Все боты
      </Button>
      <RequestFeedback
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <>
          <Typography component="h1" variant="h4">
            {query.data.login}
          </Typography>
          <Typography color="text.secondary">
            Бот #{query.data.id} · {query.data.status}
          </Typography>
          <Tabs
            value={
              ["orders", "products", "settings"].includes(tab) ? tab : "orders"
            }
            variant="scrollable"
            aria-label="Разделы бота"
          >
            {[
              ["orders", "Заказы"],
              ["products", "Товары"],
              ["settings", "Настройки"],
            ].map(([value, label]) => (
              <Tab
                key={value}
                component="a"
                href={`/admin/agents/${agent}?tab=${value}`}
                value={value}
                label={label}
              />
            ))}
          </Tabs>
          {tab === "settings" ? (
            <AgentSettings key={agent} agent={agent} session={sessionKey} />
          ) : tab === "products" ? (
            products
          ) : (
            orders
          )}
        </>
      )}
    </Stack>
  );
}

"use client";
import { Button, Stack } from "@mui/material";
import { useAccountSessionKey } from "@/entities/session";
import { AdminGiveawayEditor } from "@/features/admin-giveaway-management";

export function AdminGiveawayPage({ id }: { id: number }) {
  const session = useAccountSessionKey();
  return <Stack spacing={3}>
    <Button component="a" href="/admin/giveaways" sx={{ alignSelf: "start" }}>← К истории розыгрышей</Button>
    <AdminGiveawayEditor key={`${session}:${id}`} session={session} id={id} />
  </Stack>;
}

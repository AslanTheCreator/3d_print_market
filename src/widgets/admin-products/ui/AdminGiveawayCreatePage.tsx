"use client";
import Link from "next/link";
import { Button, Stack, Typography } from "@mui/material";
import { useAccountSessionKey } from "@/entities/session";
import { AdminGiveawayCreateForm } from "@/features/admin-giveaway-management";
export function AdminGiveawayCreatePage() {
  const session = useAccountSessionKey();
  return <Stack spacing={3}>
    <Button component={Link} prefetch={false} href="/admin/giveaways" sx={{ alignSelf: "start" }}>← К истории розыгрышей</Button>
    <Typography component="h1" variant="h4">Создать розыгрыш</Typography>
    <AdminGiveawayCreateForm key={session} session={session} />
  </Stack>;
}

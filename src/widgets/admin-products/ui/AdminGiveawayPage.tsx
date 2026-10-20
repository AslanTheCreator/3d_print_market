"use client";
import { Button, Stack } from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { adminProductReturnTo } from "../model/adminProductReturnTo";
import { useAccountSessionKey } from "@/entities/session";
import { AdminGiveawayEditor } from "@/features/admin-giveaway-management";

export function AdminGiveawayPage({ id }: { id: number }) {
  const session = useAccountSessionKey();
  const returnTo = adminProductReturnTo(useSearchParams().get("returnTo"));
  return <Stack spacing={3}>
    <Button component={Link} prefetch={false} href="/admin/giveaways" sx={{ alignSelf: "start" }}>← К истории розыгрышей</Button>
    {returnTo && <Button component={Link} prefetch={false} href={returnTo} sx={{ alignSelf: "start" }}>← К списку товаров</Button>}
    <AdminGiveawayEditor key={`${session}:${id}`} session={session} id={id} returnTo={returnTo} />
  </Stack>;
}

"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button } from "@mui/material";
import { hasAdminGiveawayAccess } from "@/entities/product";
import { usePrivateScope } from "@/shared/lib/query";
import { emptyGiveawayCreation, giveawayCreationKey, type GiveawayCreationDraft } from "../model/useAdminGiveawayCreation";

function useReceipt(session: number | null) {
  return useQuery({ queryKey: giveawayCreationKey(session), queryFn: emptyGiveawayCreation, initialData: emptyGiveawayCreation, enabled: false, staleTime: Infinity, gcTime: Infinity });
}
export function GiveawayCreateLink({ session }: { session: number | null }) {
  const client = useQueryClient(), scope = usePrivateScope(); const receipt = useReceipt(session);
  return <Button component={Link} href="/admin/giveaways/new" prefetch={false} variant="contained" disabled={receipt.data.busy} onClick={() => {
    const state = client.getQueryData<GiveawayCreationDraft>(giveawayCreationKey(session));
    if (scope.isCurrent() && scope.id === session && hasAdminGiveawayAccess(client, session) && state?.phase === "synced" && !state.busy)
      client.setQueryData(giveawayCreationKey(session), { ...emptyGiveawayCreation(), revision: state.revision + 1 });
  }}>Создать розыгрыш</Button>;
}
export function GiveawayCreationNotice({ session }: { session: number | null }) {
  const receipt = useReceipt(session);
  return receipt.data.phase === "synced" ? <Alert severity="success">{receipt.data.message}</Alert>
    : receipt.data.phase === "unknown" || receipt.data.phase === "accepted" ? <Alert severity="warning">{receipt.data.message} Откройте форму создания для проверки результата без повторной отправки.</Alert> : null;
}

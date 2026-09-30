"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { adminProductApi, adminProductKeys, type AdminProductDto } from "@/entities/product";
import { RequestFeedback } from "@/shared/ui/request-feedback";
export function ProductStatusActions({ product, session, disabled = false }: { product: AdminProductDto; session: number | null; disabled?: boolean }) {
  const client = useQueryClient();
  const [action, setAction] = useState<"ACTIVE" | "BLOCKED" | "extend" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  async function submit() {
    if (!action || lock.current) return;
    lock.current = true; setBusy(true); setError(undefined); setSaved(false);
    try {
      if (action === "extend") await adminProductApi.extend(product.participantId, product.id);
      else await adminProductApi.status(product.id, action);
      setAction(null); setSaved(true);
      await client.invalidateQueries({ queryKey: adminProductKeys.all(session) });
    } catch (cause) { setError(cause); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Stack spacing={1}>
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {product.status === "ACTIVE" && <Button disabled={disabled || busy} color="error" onClick={() => setAction("BLOCKED")}>Заблокировать</Button>}
      {product.status === "BLOCKED" && <Button disabled={disabled || busy} onClick={() => setAction("ACTIVE")}>Восстановить</Button>}
      {product.status === "TIME_EXPIRED" && <Button disabled={disabled || busy} onClick={() => setAction("extend")}>Продлить</Button>}
    </Stack>
    {saved && <Alert severity="success">Статус товара обновлён</Alert>}
    <Dialog open={action !== null} onClose={() => !busy && setAction(null)}><DialogTitle>{action === "BLOCKED" ? "Заблокировать товар?" : action === "extend" ? "Продлить публикацию?" : "Восстановить товар?"}</DialogTitle>
      <DialogContent><RequestFeedback error={error} />{product.name}</DialogContent><DialogActions><Button disabled={busy} onClick={() => setAction(null)}>Отмена</Button><Button disabled={busy} onClick={() => void submit()}>Подтвердить</Button></DialogActions></Dialog>
  </Stack>;
}

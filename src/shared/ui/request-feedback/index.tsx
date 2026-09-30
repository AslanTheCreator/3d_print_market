"use client";
import { Alert, Button, LinearProgress, Stack } from "@mui/material";
export function RequestFeedback({ pending, error, retry }: { pending?: boolean; error?: unknown; retry?: () => void }) {
  if (!pending && !error) return null;
  return <Stack spacing={1} aria-live="polite">
    {pending && <LinearProgress aria-label="Загрузка данных" />}
    {!!error && <Alert severity="error" action={retry && <Button color="inherit" onClick={retry}>Повторить</Button>}>
      {error instanceof Error ? error.message : "Не удалось загрузить данные"}
    </Alert>}
  </Stack>;
}

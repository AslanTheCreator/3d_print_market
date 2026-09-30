"use client";
import { useRef, useState } from "react";
import {
  Controller,
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { useUnsavedChanges } from "@/shared/lib";
import { ApiError } from "@/shared/lib/errorHandler";

export interface SettingsField<T> {
  name: Path<T>;
  label: string;
  numeric?: boolean;
  options?: { value: string; label: string }[];
}
interface RecordApi<T, R> {
  list: (agent: number, signal?: AbortSignal) => Promise<R[]>;
  create: (agent: number, input: T) => Promise<unknown>;
  update: (agent: number, id: number, input: T) => Promise<unknown>;
  remove: (agent: number, id: number) => Promise<unknown>;
}
export function RecordSettings<
  T extends FieldValues,
  R extends { id: number },
>({
  session,
  agent,
  resource,
  title,
  api,
  initial,
  fields,
  toInput,
  describe,
  emptyWarning,
}: {
  session: number | null;
  agent: number;
  resource: string;
  title: string;
  api: RecordApi<T, R>;
  initial: T;
  fields: SettingsField<T>[];
  toInput: (record: R) => T;
  describe: (record: R) => string;
  emptyWarning?: string;
}) {
  const query = useQuery({
    queryKey: ["admin", session, "agent", agent, resource],
    queryFn: ({ signal }) => api.list(agent, signal),
    retry: false,
  });
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [deleting, setDeleting] = useState<R | null>(null);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState<((records: R[]) => boolean) | null>(null);
  const lock = useRef(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<T>({ defaultValues: initial as DefaultValues<T> });
  useUnsavedChanges(isDirty || busy || !!unconfirmed);
  const active = (records: R[]) => records.filter((record) => !("status" in record && record.status === "DELETED"));
  const finish = () => {
    setSaved(true); setEditing(null); setDeleting(null); setUnconfirmed(null); reset(initial);
  };
  async function checkWrite(confirm: (records: R[]) => boolean) {
    const result = await query.refetch();
    if (result.error) { setError(result.error); return; }
    if (result.data && confirm(active(result.data))) { finish(); setError(undefined); }
    else setError(new Error("Результат записи пока не подтверждён. Повторная отправка заблокирована."));
  }
  async function write(task: () => Promise<unknown>, confirm: (records: R[]) => boolean) {
    if (lock.current || unconfirmed) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      await task();
      finish();
      await query.refetch();
    } catch (cause) {
      setError(cause);
      if (cause instanceof ApiError && (!cause.statusCode || cause.statusCode === 408)) {
        setUnconfirmed(() => confirm); setDeleting(null); await checkWrite(confirm);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const cancel = () => {
    if (!isDirty || window.confirm("Отменить несохранённые изменения?")) {
      setEditing(null);
      reset(initial);
    }
  };
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Typography variant="h6">{title}</Typography>
        <RequestFeedback
          pending={query.isFetching}
          error={query.error}
          retry={() => void query.refetch()}
        />
        <RequestFeedback error={error} />
        {unconfirmed && <Alert severity="warning" action={<Button disabled={busy} onClick={async () => {
          if (lock.current) return; lock.current = true; setBusy(true);
          try { await checkWrite(unconfirmed); } finally { lock.current = false; setBusy(false); }
        }}>Проверить запись</Button>}>Ответ на запись не получен. Сначала проверьте состояние списка.</Alert>}
        {saved && (
          <Alert severity="success">
            Изменение сохранено.
            {query.error
              ? " Не удалось перечитать список — повторите загрузку выше."
              : ""}
          </Alert>
        )}
        {query.data && !query.error && (
          <>
            {active(query.data).length === 0 && (
              <Alert severity={emptyWarning ? "warning" : "info"}>
                {emptyWarning ?? "Записей пока нет"}
              </Alert>
            )}
            {active(query.data).map((record) => (
              <Stack
                key={record.id}
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={1}
                sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}
              >
                <Typography
                  sx={{ alignSelf: "center", flex: 1, whiteSpace: "pre-wrap" }}
                >
                  {describe(record)}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    disabled={busy || !!unconfirmed || editing !== null}
                    onClick={() => {
                      reset(toInput(record));
                      setEditing(record.id);
                      setSaved(false);
                    }}
                  >
                    Изменить
                  </Button>
                  <Button
                    color="error"
                    disabled={busy || !!unconfirmed || editing !== null}
                    onClick={() => setDeleting(record)}
                  >
                    Удалить
                  </Button>
                </Stack>
              </Stack>
            ))}
            {editing === null ? (
              <Button
                variant="outlined"
                disabled={busy || !!unconfirmed}
                onClick={() => {
                  reset(initial);
                  setEditing("new");
                  setSaved(false);
                }}
              >
                Добавить запись
              </Button>
            ) : (
              <Stack
                component="form"
                spacing={2}
                onSubmit={handleSubmit((input) => {
                  const previousIds = new Set(query.data?.map((record) => record.id));
                  return write(() => editing === "new" ? api.create(agent, input) : api.update(agent, editing, input),
                    (records) => records.some((record) => (editing === "new" ? !previousIds.has(record.id) : record.id === editing) && JSON.stringify(toInput(record)) === JSON.stringify(input)));
                })}
              >
                {fields.map((field) => (
                  <Controller
                    key={field.name}
                    name={field.name}
                    control={control}
                    rules={
                      field.numeric
                        ? {
                            validate: (value) =>
                              Number.isInteger(value) || "Введите целое число",
                          }
                        : undefined
                    }
                    render={({ field: binding, fieldState }) => (
                      <TextField
                        {...binding}
                        value={binding.value ?? ""}
                        label={field.label}
                        disabled={busy || !!unconfirmed}
                        fullWidth
                        select={!!field.options}
                        type={field.numeric ? "number" : "text"}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        onChange={(event) =>
                          binding.onChange(
                            field.numeric
                              ? event.target.value === ""
                                ? ""
                                : Number(event.target.value)
                              : event.target.value,
                          )
                        }
                      >
                        {field.options?.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                ))}
                <Stack direction="row" spacing={1}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={busy || !!unconfirmed || query.isFetching}
                  >
                    Сохранить запись
                  </Button>
                  <Button disabled={busy || !!unconfirmed} onClick={cancel}>
                    Отмена
                  </Button>
                </Stack>
              </Stack>
            )}
          </>
        )}
        <Dialog open={!!deleting} onClose={() => !busy && setDeleting(null)}>
          <DialogTitle>Удалить запись?</DialogTitle>
          <DialogContent>Запись будет удалена из настроек бота.</DialogContent>
          <DialogActions>
            <Button disabled={busy || !!unconfirmed} onClick={() => setDeleting(null)}>
              Оставить
            </Button>
            <Button
              color="error"
              disabled={busy || !!unconfirmed}
              onClick={() =>
                deleting && void write(() => api.remove(agent, deleting.id), (records) => !records.some((record) => record.id === deleting.id))
              }
            >
              Удалить
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Paper>
  );
}

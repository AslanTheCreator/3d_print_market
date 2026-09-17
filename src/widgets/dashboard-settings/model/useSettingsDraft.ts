"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form";

export interface SettingsOperation {
  key: string;
  label: string;
  run: () => Promise<unknown>;
}

export const useSettingsDraft = <TRecord, TForm extends FieldValues & { items: Record<string, unknown> }>({
  existing,
  buildValues,
  refresh,
}: {
  existing: TRecord[];
  buildValues: (records: TRecord[]) => TForm;
  refresh: () => Promise<TRecord[]>;
}) => {
  const [baseline, setBaseline] = useState(existing);
  const form = useForm<TForm>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: buildValues(existing) as DefaultValues<TForm>,
  });
  const { reset, formState: { isDirty } } = form;
  const [isPending, setIsPending] = useState(false);
  const [wasSaved, setWasSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const saving = useRef(false);
  const pendingResult = useRef<{
    data: TForm;
    failed: { key: string; label: string }[];
    succeeded: number;
  } | null>(null);

  useEffect(() => {
    if (isDirty || saving.current || pendingResult.current) return;
    setBaseline(existing);
    reset(buildValues(existing));
  }, [existing, buildValues, isDirty, reset]);

  const markUnsaved = useCallback(() => {
    setWasSaved(false);
    setSaveError(null);
  }, []);

  const reconcile = useCallback(async () => {
    const result = pendingResult.current;
    if (!result) return;
    try {
      const records = await refresh();
      setBaseline(records);
      const confirmed = buildValues(records);
      reset(confirmed);
      if (result.failed.length) {
        // Keep the submitted draft against the freshly confirmed defaults.
        const retained = { ...confirmed, items: { ...confirmed.items } };
        for (const { key } of result.failed) {
          retained.items[key] = result.data.items[key];
        }
        reset(retained, { keepDefaultValues: true });
        setSaveError(`${result.succeeded ? `Сохранено изменений: ${result.succeeded}. ` : ""}Не удалось сохранить: ${result.failed.map(({ label }) => label).join(", ")}. Повторите сохранение оставшихся изменений.`);
      } else {
        setWasSaved(true);
        setSaveError(null);
      }
      pendingResult.current = null;
      setNeedsRefresh(false);
    } catch {
      // A successful create has no returned ID. Read it before allowing another write.
      setNeedsRefresh(true);
      setSaveError("Запросы выполнены, но результат не удалось загрузить. Повторите загрузку перед следующим сохранением; введённые данные сохранены в форме.");
    }
  }, [buildValues, refresh, reset]);

  const runSave = useCallback(async (data: TForm, operations: SettingsOperation[]) => {
    if (saving.current || pendingResult.current || !operations.length) return;
    saving.current = true;
    setIsPending(true);
    setSaveError(null);
    setWasSaved(false);
    const result = { data, failed: [] as { key: string; label: string }[], succeeded: 0 };
    // Sequential mutations prevent optimistic rollbacks from overwriting other results.
    for (const operation of operations) {
      try {
        await operation.run();
        result.succeeded++;
      } catch {
        result.failed.push({ key: operation.key, label: operation.label });
      }
    }
    pendingResult.current = result;
    await reconcile();
    saving.current = false;
    setIsPending(false);
  }, [reconcile]);

  const retryRefresh = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    setIsPending(true);
    await reconcile();
    saving.current = false;
    setIsPending(false);
  }, [reconcile]);

  return { ...form, baseline, isPending, wasSaved, saveError, needsRefresh, markUnsaved, runSave, retryRefresh };
};

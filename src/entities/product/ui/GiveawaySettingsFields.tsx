"use client";
import { Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { validateGiveawaySettings, type GiveawaySettingsValues } from "../model/giveawaySettings";

export function GiveawaySettingsFields({ form, disabled, windowError }: { form: UseFormReturn<GiveawaySettingsValues>; disabled: boolean; windowError?: string }) {
  const fields = [["telegramUrl", "Telegram-ссылка"], ["startAt", "Начало (ISO 8601)"], ["endAt", "Окончание (ISO 8601)"],
    ["winnersCount", "Число победителей"], ["rules", "Правила участия"], ["homeText", "Текст на главной"]] as const;
  return <Stack spacing={2}>
    <Controller name="enabled" control={form.control} render={({ field }) => <FormControlLabel label="Розыгрыш включён" control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} disabled={disabled} />} />} />
    <Typography variant="body2">Часовой пояс задаётся в каждой дате: Z (UTC) или смещение, например +03:00. Формат: 2027-06-01T15:00:00+03:00.</Typography>
    {fields.map(([name, label]) => <TextField key={name} label={label} disabled={disabled} fullWidth
      type={name === "winnersCount" ? "number" : "text"} multiline={name === "rules" || name === "homeText"}
      inputProps={name === "winnersCount" ? { step: "any" } : undefined}
      minRows={name === "rules" || name === "homeText" ? 3 : undefined}
      {...form.register(name, { valueAsNumber: name === "winnersCount", validate: () => validateGiveawaySettings(form.getValues())[name] ?? true })}
      error={!!form.formState.errors[name] || (!!windowError && (name === "startAt" || name === "endAt"))}
      helperText={form.formState.errors[name]?.message ?? ((name === "startAt" || name === "endAt") ? windowError : undefined)} />)}
  </Stack>;
}

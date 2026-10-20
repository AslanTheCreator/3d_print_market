"use client";
import { Controller, type UseFormReturn } from "react-hook-form";
import { MenuItem, Stack, TextField } from "@mui/material";
import type { CategoryModel } from "@/entities/category/@x/product";
import { productCurrencies } from "../model/form";
import { validateGiveawayProduct, type GiveawayProductValues } from "../model/giveawayCreation";

const flatten = (items: CategoryModel[], prefix = ""): { id: number; label: string }[] => items.flatMap(item => [
  { id: item.id, label: prefix + item.name }, ...flatten(item.childs ?? [], `${prefix}${item.name} / `),
]);
export function GiveawayProductFields({ form, categories, disabled }: { form: UseFormReturn<GiveawayProductValues>; categories: CategoryModel[]; disabled: boolean }) {
  const options = flatten(categories);
  form.watch("categoryIds").forEach(id => { if (!options.some(option => option.id === id)) options.push({ id, label: `Категория #${id}` }); });
  return <Stack spacing={2}>
    {([["name", "Название приза"], ["description", "Описание приза"]] as const).map(([name, label]) => <TextField key={name} label={label} disabled={disabled}
      multiline={name === "description"} minRows={name === "description" ? 3 : undefined} fullWidth
      {...form.register(name, { validate: () => validateGiveawayProduct(form.getValues())[name] ?? true })}
      error={!!form.formState.errors[name]} helperText={form.formState.errors[name]?.message} />)}
    <Controller name="currency" control={form.control} render={({ field }) => <TextField {...field} select label="Валюта" disabled={disabled}>
      {productCurrencies.map(item => <MenuItem key={item.code} value={item.code}>{item.code} ({item.symbol})</MenuItem>)}
    </TextField>} />
    <Controller name="categoryIds" control={form.control} render={({ field }) => <TextField {...field} select label="Категории (необязательно)" disabled={disabled} SelectProps={{ multiple: true }}>
      {options.map(item => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
    </TextField>} />
  </Stack>;
}

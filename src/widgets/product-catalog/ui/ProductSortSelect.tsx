"use client";

import { useId } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { SortBy } from "@/entities/product";

const sortLabels = {
  DATE_DESC: "Сначала новые",
  DATE_ASC: "Сначала старые",
  PRICE_ASC: "Сначала дешевле",
  PRICE_DESC: "Сначала дороже",
  SELLER_RATING_ASC: "Рейтинг продавца: по возрастанию",
  SELLER_RATING_DESC: "Рейтинг продавца: по убыванию",
} satisfies Record<SortBy, string>;

interface ProductSortSelectProps {
  value: SortBy;
  onChange: (sortBy: SortBy) => void;
}

export function ProductSortSelect({ value, onChange }: ProductSortSelectProps) {
  const labelId = useId();
  return (
    <FormControl size="small" sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 200 } }}>
      <InputLabel id={labelId}>Сортировка</InputLabel>
      <Select<SortBy>
        labelId={labelId}
        label="Сортировка"
        value={value}
        onChange={event => onChange(event.target.value as SortBy)}
        sx={{ minHeight: 44, borderRadius: 2, bgcolor: "background.paper" }}
      >
        {Object.entries(sortLabels).map(([sortBy, label]) => (
          <MenuItem key={sortBy} value={sortBy} sx={{ minHeight: 44 }}>{label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

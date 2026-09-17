"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormControlLabel, FormHelperText, InputLabel,
  MenuItem, OutlinedInput, Select, Stack, TextField, Typography,
} from "@mui/material";
import type { CategoryModel } from "@/entities/category";
import { flattenCategories } from "./productFormHelpers";

interface ProductCategoryPickerProps {
  categories: CategoryModel[];
  value: number[];
  onChange: (value: number[]) => void;
  onBlur: () => void;
  error?: string;
  compactMobile: boolean;
}

const categoryPaths = (categories: CategoryModel[], ancestors: string[] = []): Array<{
  id: number; name: string; ancestors: string[];
}> => categories.flatMap((category) => [
  { id: category.id, name: category.name, ancestors },
  ...categoryPaths(category.childs, [...ancestors, category.name]),
]);

export const ProductCategoryPicker = ({
  categories, value, onChange, onBlur, error, compactMobile,
}: ProductCategoryPickerProps) => {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const paths = useMemo(() => categoryPaths(categories), [categories]);
  const query = search.trim().toLocaleLowerCase("ru");
  const visibleCategories = paths.filter((category) =>
    (!selectedOnly || selection.includes(category.id)) &&
    [...category.ancestors, category.name].join(" ").toLocaleLowerCase("ru").includes(query),
  );

  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia("(min-width: 900px)");
    const closeOnWide = () => { if (wide.matches) setOpen(false); };
    wide.addEventListener("change", closeOnWide);
    closeOnWide();
    return () => wide.removeEventListener("change", closeOnWide);
  }, [open]);

  const openPicker = () => {
    setSelection([...value]);
    setSearch("");
    setSelectedOnly(false);
    setOpen(true);
  };

  return (
    <>
      <FormControl
        fullWidth required error={!!error}
        sx={{ display: compactMobile ? { xs: "none", md: "inline-flex" } : "inline-flex" }}
      >
        <InputLabel id="category-label">Категория</InputLabel>
        <Select
          labelId="category-label" id="categoryIds" multiple label="Категория"
          value={value} onChange={(event) => onChange(event.target.value as number[])}
          onBlur={onBlur} input={<OutlinedInput label="Категория" />}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((id) => <Chip key={id} label={flatCategories.find((item) => item.id === id)?.name ?? id} size="small" />)}
            </Box>
          )}
        >
          {flatCategories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              <Checkbox checked={value.includes(category.id)} />
              <Box component="span" sx={{ pl: category.depth * 2, whiteSpace: "normal" }}>{category.name}</Box>
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{error ?? "Можно выбрать основную или вложенную категорию."}</FormHelperText>
      </FormControl>

      {compactMobile && (
        <>
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            <Button
              id="product-categories-mobile" ref={triggerRef} fullWidth variant="outlined"
              aria-haspopup="dialog" aria-expanded={open} aria-label="Выбрать категории"
              aria-describedby="product-categories-help" aria-invalid={!!error}
              onClick={openPicker} onBlur={onBlur}
              sx={{ minHeight: 56, p: 1.5, textAlign: "left", justifyContent: "space-between", gap: 1,
                borderColor: error ? "error.main" : "divider", color: "text.primary",
                "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 } }}
            >
              <Box component="span" sx={{ minWidth: 0 }}>
                <Typography component="span" variant="body2" display="block">Категория *</Typography>
                <Typography component="span" variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                  {value.length ? paths.filter((item) => value.includes(item.id)).map((item) => item.name).join(", ") : "Выбрать категории"}
                </Typography>
              </Box>
              {value.length > 0 && <Chip component="span" size="small" label={value.length} />}
            </Button>
            <FormHelperText id="product-categories-help" error={!!error}>
              {error ?? "Можно выбрать родительские и вложенные категории."}
            </FormHelperText>
          </Box>
          <Dialog
            open={open} onClose={() => setOpen(false)} fullScreen
            aria-labelledby="product-category-picker-title"
            TransitionProps={{ onExited: () => {
              const target = window.matchMedia("(min-width: 900px)").matches
                ? document.getElementById("categoryIds") : triggerRef.current;
              target?.focus();
            } }}
            PaperProps={{ sx: { m: { xs: 0 }, width: "100%", maxWidth: { xs: "none" }, borderRadius: 0, height: "100dvh", maxHeight: "100dvh", pt: "env(safe-area-inset-top)" } }}
          >
            <DialogTitle id="product-category-picker-title" sx={{ px: 2, py: 1.5 }}>Категории товара</DialogTitle>
            <Stack spacing={1} sx={{ px: 2, pb: 1 }}>
              <TextField
                autoFocus fullWidth label="Поиск категорий" value={search}
                onChange={(event) => setSearch(event.target.value)}
                inputProps={{ enterKeyHint: "search" }}
                onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
              />
              <Button
                aria-pressed={selectedOnly} onClick={() => setSelectedOnly((previous) => !previous)}
                variant={selectedOnly ? "contained" : "outlined"}
                sx={{ minHeight: 44, alignSelf: "flex-start" }}
              >Выбранные ({selection.length})</Button>
            </Stack>
            <DialogContent dividers sx={{ p: 1, overscrollBehavior: "contain" }}>
              {visibleCategories.length === 0 ? (
                <Typography role="status" color="text.secondary" sx={{ p: 1 }}>
                  {categories.length === 0 ? "Категории пока не добавлены." : selectedOnly && !selection.length ? "Пока ничего не выбрано." : "Категории не найдены."}
                </Typography>
              ) : (
                <Box component="ul" aria-label="Категории" sx={{ listStyle: "none", p: 0, m: 0 }}>
                  {visibleCategories.map((category) => (
                    <Box component="li" key={category.id} sx={{ pl: Math.min(category.ancestors.length, 3) * 1.5 }}>
                      <FormControlLabel
                        sx={{ m: 0, width: "100%", minHeight: 52, pr: 1, borderRadius: 1,
                          "&:focus-within": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
                          "& .MuiFormControlLabel-label": { minWidth: 0 } }}
                        control={<Checkbox
                          checked={selection.includes(category.id)}
                          inputProps={{ "aria-label": category.name }}
                          sx={{ width: 44, height: 44, flexShrink: 0 }}
                          onChange={(_, checked) => setSelection((previous) => checked
                            ? [...previous, category.id] : previous.filter((id) => id !== category.id))}
                        />}
                        label={<Box sx={{ py: 0.5, overflowWrap: "anywhere" }}>
                          <Typography variant="body2">{category.name}</Typography>
                          {category.ancestors.length > 0 && <Typography variant="caption" color="text.secondary">{category.ancestors.join(" › ")}</Typography>}
                        </Box>}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))", gap: 1 }}>
              <Button onClick={() => setOpen(false)} sx={{ minHeight: 48 }}>Отмена</Button>
              <Button variant="contained" onClick={() => { onChange(selection); onBlur(); setOpen(false); }} sx={{ minHeight: 48, flex: 1 }}>Готово</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </>
  );
};

"use client";

import { useState } from "react";
import { CloseRounded, TuneRounded } from "@mui/icons-material";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, FormLabel, IconButton, Radio, RadioGroup, Stack, Typography,
} from "@mui/material";
import type { ListOrdersModel } from "@/entities/order";
import type { OrdersSortId, OrdersUserRole } from "../model/dashboardOrders";
import { filterMobileOrders, getMobileOrdersFilters, type MobileOrdersFilterId } from "../model/mobileOrders";

interface MobileOrdersControlsProps {
  orders: readonly ListOrdersModel[];
  userRole: OrdersUserRole;
  filter: MobileOrdersFilterId;
  sort: OrdersSortId;
  onChange: (filter: MobileOrdersFilterId, sort: OrdersSortId) => void;
}

export const MobileOrdersControls = ({ orders, userRole, filter, sort, onChange }: MobileOrdersControlsProps) => {
  const [open, setOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState(filter);
  const [draftSort, setDraftSort] = useState(sort);
  const filters = getMobileOrdersFilters(userRole);
  const quickIds: MobileOrdersFilterId[] = userRole === "seller"
    ? ["all", "confirmation", "assembling"]
    : ["all", "active"];
  const quickFilters = quickIds.map((id) => filters.find((item) => item.id === id)!);

  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: userRole === "seller" ? "repeat(2, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr)) 44px", gap: 1 }}>
        {quickFilters.map((item) => (
          <Button
            key={item.id}
            variant={filter === item.id ? "contained" : "outlined"}
            aria-pressed={filter === item.id}
            onClick={() => onChange(item.id, sort)}
            sx={{ minWidth: 0, minHeight: 44, px: 1, textTransform: "none", fontSize: 14, lineHeight: 1.3, gap: 0.5 }}
          >
            {item.label}
            <Box component="span" sx={{ fontSize: 12, flexShrink: 0 }}>
              {filterMobileOrders(orders, item.id, userRole).length}
            </Box>
          </Button>
        ))}
        <Button
          variant="outlined"
          aria-label="Фильтры и сортировка"
          aria-haspopup="dialog"
          onClick={() => { setDraftFilter(filter); setDraftSort(sort); setOpen(true); }}
          sx={{ minWidth: 44, px: 1, gap: 0.75, textTransform: "none" }}
        >
          <TuneRounded />
          {userRole === "seller" && "Фильтры"}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 1 }}>
        {filters.find((item) => item.id === filter)?.label} · {filterMobileOrders(orders, filter, userRole).length}
        {sort === "newest" ? " · Сначала новые" : sort === "oldest" ? " · Сначала старые" : " · Сначала важные"}
      </Typography>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="mobile-orders-filters-title"
        PaperProps={{ sx: {
          m: { xs: 0, md: 4 }, width: { xs: "100%", md: 480 }, maxWidth: "100%",
          height: { xs: "100dvh", md: "auto" }, maxHeight: "100dvh", borderRadius: { xs: 0, md: 2 },
          pt: "env(safe-area-inset-top, 0px)", pb: "env(safe-area-inset-bottom, 0px)",
        } }}
      >
        <DialogTitle id="mobile-orders-filters-title" sx={{ pr: 7 }}>
          Фильтры и сортировка
          <IconButton aria-label="Закрыть фильтры" onClick={() => setOpen(false)} sx={{ position: "absolute", right: 8, top: "calc(8px + env(safe-area-inset-top, 0px))" }}>
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel id="mobile-orders-status-label">Статус заказа</FormLabel>
              <RadioGroup aria-labelledby="mobile-orders-status-label" value={draftFilter} onChange={(_, value) => setDraftFilter(value as MobileOrdersFilterId)}>
                {filters.map((item) => (
                  <FormControlLabel key={item.id} value={item.id} control={<Radio />} label={`${item.label} (${filterMobileOrders(orders, item.id, userRole).length})`} sx={{ minHeight: 44 }} />
                ))}
              </RadioGroup>
            </FormControl>
            <FormControl>
              <FormLabel id="mobile-orders-sort-label">Сортировка заказов</FormLabel>
              <RadioGroup aria-labelledby="mobile-orders-sort-label" value={draftSort} onChange={(_, value) => setDraftSort(value as OrdersSortId)}>
                <FormControlLabel value="attention" control={<Radio />} label="Сначала важные" />
                <FormControlLabel value="newest" control={<Radio />} label="Сначала новые" />
                <FormControlLabel value="oldest" control={<Radio />} label="Сначала старые" />
              </RadioGroup>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setDraftFilter("all"); setDraftSort("attention"); }}>Сбросить</Button>
          <Button variant="contained" onClick={() => { onChange(draftFilter, draftSort); setOpen(false); }}>Применить</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

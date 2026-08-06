"use client";

import React from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import type {
  OrdersFilterId,
  OrdersFilterOption,
  OrdersSortId,
} from "../model/dashboardOrders";

interface OrdersControlsProps {
  filters: readonly OrdersFilterOption[];
  filterCounts: Record<OrdersFilterId, number>;
  activeFilter: OrdersFilterId;
  onFilterChange: (filterId: OrdersFilterId) => void;
  sort: OrdersSortId;
  onSortChange: (sortId: OrdersSortId) => void;
}

export const OrdersControls = ({
  filters,
  filterCounts,
  activeFilter,
  onFilterChange,
  sort,
  onSortChange,
}: OrdersControlsProps) => {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      alignItems={{ xs: "stretch", md: "center" }}
      justifyContent="space-between"
    >
      <Box
        sx={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          pb: 0.5,
          minWidth: 0,
          flexGrow: 1,
        }}
      >
        {filters.map((filter) => {
          const isActive = filter.id === activeFilter;
          const count = filterCounts[filter.id];

          return (
            <Button
              key={filter.id}
              variant={isActive ? "contained" : "outlined"}
              color={isActive ? "primary" : "inherit"}
              onClick={() => onFilterChange(filter.id)}
              size="small"
              sx={{
                flexShrink: 0,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <span>{filter.label}</span>
                {count > 0 && (
                  <Chip
                    label={count}
                    size="small"
                    color={isActive ? "default" : "primary"}
                    sx={{
                      height: 18,
                      minWidth: 18,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                    }}
                  />
                )}
              </Stack>
            </Button>
          );
        })}
      </Box>

      <TextField
        select
        label="Сортировка заказов"
        value={sort}
        onChange={(event) => onSortChange(event.target.value as OrdersSortId)}
        size="small"
        sx={{
          width: { xs: "100%", sm: 220 },
          flexShrink: 0,
          "& .MuiSelect-select": {
            pr: 4,
          },
        }}
      >
        <MenuItem value="attention">Сначала важные</MenuItem>
        <MenuItem value="newest">Сначала новые</MenuItem>
        <MenuItem value="oldest">Сначала старые</MenuItem>
      </TextField>
    </Stack>
  );
};

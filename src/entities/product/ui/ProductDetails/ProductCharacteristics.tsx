"use client";

import { Box, Typography, Paper, Stack } from "@mui/material";
import { memo } from "react";

interface Characteristic {
  label: string;
  value: string;
}

interface ProductCharacteristicsProps {
  characteristics: Characteristic[];
  productId?: number;
  categoryName?: string;
}

export const ProductCharacteristics = memo<ProductCharacteristicsProps>(
  ({ characteristics, productId, categoryName }) => (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 2, sm: 2.5 },
        overflow: "hidden",
      }}
    >
      <Box p={{ xs: 2, sm: 3 }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: { xs: "1.125rem", sm: "1.25rem" } }}
        >
          Характеристики
        </Typography>

        <Stack spacing={1.5}>
          {categoryName && (
            <CharacteristicRow label="Категория" value={categoryName} />
          )}

          {productId && <CharacteristicRow label="Артикул" value={productId} />}

          {characteristics.map((char, index) => (
            <CharacteristicRow
              key={index}
              label={char.label}
              value={char.value}
            />
          ))}
        </Stack>
      </Box>
    </Paper>
  )
);

ProductCharacteristics.displayName = "ProductCharacteristics";

const CharacteristicRow = memo<{ label: string; value: number | string }>(
  ({ label, value }) => (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="flex-start"
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: "40%", pr: 2 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={500}
        sx={{ textAlign: "right", flex: 1 }}
      >
        {value}
      </Typography>
    </Stack>
  )
);

CharacteristicRow.displayName = "CharacteristicRow";

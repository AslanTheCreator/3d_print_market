"use client";

import { Chip } from "@mui/material";
import { CategoryModel } from "@/shared/types";

interface ProductCategoryChipsProps {
  categories: CategoryModel[];
  onCategoryClick: (category: CategoryModel) => void;
}

export function ProductCategoryChips({
  categories,
  onCategoryClick,
}: ProductCategoryChipsProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <>
      {categories.map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          size="small"
          variant="outlined"
          color="secondary"
          clickable
          onClick={() => onCategoryClick(category)}
          sx={{
            fontWeight: 600,
            cursor: "pointer",
            "&:hover": {
              bgcolor: "secondary.main",
              color: "secondary.contrastText",
            },
          }}
        />
      ))}
    </>
  );
}

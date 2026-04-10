import { Box, Typography } from "@mui/material";
import { CategoryBreadcrumbs, type CategoryPath } from "@/entities/category";
import type { PriceRange } from "@/shared/types";
import { PriceRangeFilter } from "./PriceRangeFilter";

interface CategoryPageHeaderProps {
  categoryPath: CategoryPath;
  priceRange?: PriceRange;
  availablePriceRange?: PriceRange;
  onPriceRangeApply: (value?: PriceRange) => void;
}

export const CategoryPageHeader = ({
  categoryPath,
  priceRange,
  availablePriceRange,
  onPriceRangeApply,
}: CategoryPageHeaderProps) => {
  return (
    <>
      <CategoryBreadcrumbs items={categoryPath.breadcrumbs} />

      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          mb: 3,
          fontWeight: 600,
          color: "text.primary",
        }}
      >
        {categoryPath.title}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 3,
        }}
      >
        <PriceRangeFilter
          value={priceRange}
          availableRange={availablePriceRange}
          onApply={onPriceRangeApply}
        />
      </Box>
    </>
  );
};

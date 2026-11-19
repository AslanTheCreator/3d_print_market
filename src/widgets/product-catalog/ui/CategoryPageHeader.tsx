import { Box, Typography } from "@mui/material";
import { CategoryBreadcrumbs, type CategoryPath } from "@/entities/category";
import type { PriceRange, SortBy } from "@/entities/product";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { ProductSortSelect } from "./ProductSortSelect";

interface CategoryPageHeaderProps {
  categoryPath: CategoryPath;
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  priceRange?: PriceRange;
  availablePriceRange?: PriceRange;
  onPriceRangeApply: (value?: PriceRange) => void;
}

export const CategoryPageHeader = ({
  categoryPath,
  sortBy,
  onSortChange,
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
        <ProductSortSelect value={sortBy} onChange={onSortChange} />
      </Box>
    </>
  );
};

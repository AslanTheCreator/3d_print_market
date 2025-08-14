"use client";

import { Box, Typography, Paper } from "@mui/material";
import { InfiniteScroll } from "@/shared/ui";
import { ProductCatalog } from "@/widgets/product-catalog";
import { useProductsInfinite } from "@/entities/product";

interface RelatedProductsProps {
  categoryId: number;
}

export function RelatedProducts({ categoryId }: RelatedProductsProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useProductsInfinite(10, { categoryId });

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 2.5 },
        overflow: "hidden",
        mb: { xs: 10, sm: 0 },
      }}
    >
      <Box p={{ xs: 2, sm: 3 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          mb={{ xs: 2, sm: 3 }}
          sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
        >
          Смотрите также
        </Typography>

        <InfiniteScroll
          onLoadMore={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        >
          <ProductCatalog
            products={data?.pages.flat() ?? []}
            isLoading={isLoading}
          />
        </InfiniteScroll>
      </Box>
    </Paper>
  );
}

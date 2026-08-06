"use client";

import { Box, Container, Skeleton } from "@mui/material";
import { ProductGridSkeleton } from "@/entities/product";
import { SEARCH_PRODUCTS_PAGE_SIZE } from "../model/pageSizes";

export const SearchProductsSkeleton = () => (
  <Container sx={{ pt: "20px" }} aria-busy="true">
    <Skeleton variant="text" width="min(100%, 440px)" height={48} />

    <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
      <Skeleton variant="rounded" width={160} height={44} />
    </Box>

    <Box pt="20px">
      <ProductGridSkeleton count={SEARCH_PRODUCTS_PAGE_SIZE} />
    </Box>
  </Container>
);

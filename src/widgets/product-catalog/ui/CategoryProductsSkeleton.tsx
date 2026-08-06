"use client";

import { Box, Container, Skeleton } from "@mui/material";
import { ProductGridSkeleton } from "@/entities/product";
import { CATEGORY_PRODUCTS_PAGE_SIZE } from "../model/pageSizes";

export const CategoryProductsSkeleton = () => (
  <Container sx={{ pt: "20px" }} aria-busy="true">
    <Skeleton variant="text" width={240} height={24} sx={{ mb: 3 }} />
    <Skeleton
      variant="text"
      width="55%"
      sx={{ mb: 3, fontSize: { xs: "2rem", sm: "2.125rem" } }}
    />

    <Box sx={{ mb: 3 }}>
      <Skeleton variant="rounded" width={190} height={40} />
    </Box>

    <Box>
      <ProductGridSkeleton count={CATEGORY_PRODUCTS_PAGE_SIZE} />
    </Box>
  </Container>
);

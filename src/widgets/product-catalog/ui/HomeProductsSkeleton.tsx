"use client";

import { Box, Container, Skeleton } from "@mui/material";
import {
  ProductGridItem,
  ProductGridSkeleton,
} from "@/entities/product";
import { GiveawayCard } from "./GiveawayCard";
import { HOME_PRODUCTS_PAGE_SIZE } from "../model/pageSizes";

export const HomeProductsSkeleton = () => (
  <Container sx={{ pt: "20px" }} aria-busy="true">
    <Skeleton
      variant="text"
      width={180}
      sx={{
        mb: { xs: 2, sm: 3 },
        fontSize: { xs: "1.75rem", sm: "2rem" },
      }}
    />

    <Box>
      <ProductGridSkeleton
        count={HOME_PRODUCTS_PAGE_SIZE}
        leadingContent={
          <ProductGridItem xs={12} sm={6} md={6} lg={4}>
            <GiveawayCard />
          </ProductGridItem>
        }
      />
    </Box>
  </Container>
);

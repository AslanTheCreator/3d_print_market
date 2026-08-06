import React from "react";
import { ProductCardSkeleton } from "./ProductCardSkeleton";
import { ProductGrid, ProductGridItem } from "./ProductGrid";

interface ProductGridSkeletonProps {
  count?: number;
  leadingContent?: React.ReactNode;
}

export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  count = 12,
  leadingContent,
}) => (
  <ProductGrid>
    {leadingContent}
    {Array.from({ length: count }).map((_, index) => (
      <ProductGridItem key={index}>
        <ProductCardSkeleton />
      </ProductGridItem>
    ))}
  </ProductGrid>
);

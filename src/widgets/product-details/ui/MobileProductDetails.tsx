"use client";

import { Box, Typography, Stack } from "@mui/material";
import { ImageGallery } from "@/shared/ui";
import {
  ProductPrice,
  ProductRating,
  ProductDescription,
  ProductDetailsModel,
} from "@/entities/product";
import { RelatedProducts } from "./RelatedProducts";
import { FixedBottomCart } from "./FixedBottomCart";

interface MobileProductDetailsProps {
  productCard: ProductDetailsModel;
  allImages: string[];
  averageRating?: number;
  sellerName?: string;
}

export function MobileProductDetails({
  productCard,
  allImages,
  averageRating,
  sellerName,
}: MobileProductDetailsProps) {
  return (
    <Box component="section" sx={{ bgcolor: "background.default", pb: 10 }}>
      <Typography
        component="h1"
        variant="h4"
        fontWeight={700}
        sx={{
          fontSize: "1.5rem",
          lineHeight: 1.2,
          my: 1.5,
          ml: 1.5,
        }}
      >
        {productCard.name}
      </Typography>

      <ImageGallery images={allImages} alt={productCard.name} />

      <Stack
        flexDirection="row"
        justifyContent="space-between"
        mb={1.5}
        mt={1.5}
      >
        <ProductPrice
          price={productCard.price}
          prepaymentAmount={productCard.prepaymentAmount}
          availability={productCard.availability}
        />

        <ProductRating
          sellerName={sellerName}
          rating={averageRating}
          reviewsCount={100}
        />
      </Stack>

      <ProductDescription description={productCard.description} />
      <RelatedProducts categoryId={productCard.categories.id} />

      <FixedBottomCart
        productId={productCard.id}
        availability={productCard.availability}
        productName={productCard.name}
      />
    </Box>
  );
}

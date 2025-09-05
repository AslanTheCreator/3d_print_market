"use client";

import { Container, Typography, Grid, Stack, Box } from "@mui/material";
import { ImageGallery } from "@/shared/ui";
import {
  ProductPrice,
  ProductRating,
  ProductDescription,
  ProductDetailsModel,
} from "@/entities/product";
import { AddToCartButton } from "@/features/cart";
import { RelatedProducts } from "./RelatedProducts";

interface DesktopProductDetailsProps {
  productCard: ProductDetailsModel;
  allImages: string[];
  averageRating?: number;
  sellerName?: string;
}

export function DesktopProductDetails({
  productCard,
  allImages,
  averageRating,
  sellerName,
}: DesktopProductDetailsProps) {
  return (
    <Container
      maxWidth="lg"
      sx={{
        bgcolor: "background.default",
        pt: { xs: 2, sm: 3, md: 4 },
        pb: { xs: 4, sm: 6, md: 8 },
      }}
    >
      <Typography
        component="h1"
        variant="h3"
        fontWeight={700}
        mb={{ xs: 2, sm: 3, md: 4 }}
        sx={{
          fontSize: { sm: "1.75rem", md: "2.25rem", lg: "2.5rem" },
          lineHeight: 1.2,
        }}
      >
        {productCard.name}
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3, md: 4, lg: 6 }}>
        <Grid item xs={12} md={6} lg={7}>
          <Box sx={{ position: "sticky", top: 20 }}>
            <ImageGallery images={allImages} alt={productCard.name} />
          </Box>
        </Grid>

        <Grid item xs={12} md={6} lg={5}>
          <Stack spacing={{ xs: 2, sm: 3 }}>
            <Stack spacing={2}>
              <ProductPrice
                price={productCard.price}
                prepaymentAmount={productCard.prepaymentAmount}
                availability={productCard.availability}
              />
              <ProductRating
                sellerName={sellerName}
                rating={averageRating}
                reviewsCount={127}
              />
            </Stack>

            <Box sx={{ pt: { xs: 1, sm: 2 } }}>
              <AddToCartButton
                productId={productCard.id}
                availability={productCard.availability}
                variant="detailed"
                productName={productCard.name}
              />
            </Box>

            <ProductDescription description={productCard.description} />
          </Stack>
        </Grid>
      </Grid>

      <Box sx={{ mt: { xs: 4, sm: 6, md: 8 } }}>
        <RelatedProducts categoryId={productCard.categories[0].id} />
      </Box>
    </Container>
  );
}

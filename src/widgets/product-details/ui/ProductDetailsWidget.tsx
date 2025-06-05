"use client";

import {
  Typography,
  Box,
  Stack,
  Container,
  Paper,
  useTheme,
  useMediaQuery,
  Grid,
} from "@mui/material";
import { memo } from "react";
import { ImageGallery } from "@/shared/ui";
import { RelatedProducts } from "./RelatedProducts";
import {
  ProductCharacteristics,
  ProductDetailsModel,
  ProductDescription,
  ProductPrice,
  ProductRating,
  useProductDetails,
  ProductDetailsSkeleton,
} from "@/entities/product";
import { AddToCartButton } from "@/features/cart";

export const ProductDetailsWidget = memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const {
    productCard,
    allImages,
    isLoading,
    isError,
    error,
    averageRating,
    sellerName,
  } = useProductDetails();

  if (isLoading) {
    return <ProductDetailsSkeleton />;
  }

  if (isError) {
    return;
  }

  if (!productCard) {
    return <Container maxWidth="lg" sx={{ pt: { xs: 1, sm: 2, md: 3 } }} />;
  }

  if (isMobile) {
    return (
      <MobileProductDetails
        productCard={productCard}
        allImages={allImages}
        averageRating={averageRating}
        sellerName={sellerName}
      />
    );
  }

  return (
    <DesktopProductDetails
      productCard={productCard}
      allImages={allImages}
      isDesktop={isDesktop}
      averageRating={averageRating}
      sellerName={sellerName}
    />
  );
});

ProductDetailsWidget.displayName = "ProductDetailsWidget";

interface MobileProductDetailsProps {
  productCard: ProductDetailsModel;
  allImages: string[];
  averageRating?: number;
  sellerName?: string;
}
// Mobile version component
const MobileProductDetails = memo(
  ({
    productCard,
    allImages,
    averageRating,
    sellerName,
  }: MobileProductDetailsProps) => (
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
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        mb={1.5}
      >
        <ProductPrice price={productCard.price} />
        <ProductRating
          sellerName={sellerName}
          rating={averageRating}
          reviewsCount={0}
        />
      </Stack>

      <DescriptionSection description={productCard.description} />
      <RelatedProducts categoryId={productCard.category.id} />

      <FixedBottomCart productId={productCard.id} />
    </Box>
  )
);

MobileProductDetails.displayName = "MobileProductDetails";

interface DesctopProductDetailsProps {
  productCard: ProductDetailsModel;
  allImages: string[];
  isDesktop: boolean;
  averageRating?: number;
  sellerName?: string;
}
// Desktop version component
const DesktopProductDetails = memo(
  ({
    productCard,
    allImages,
    isDesktop,
    averageRating,
    sellerName,
  }: DesctopProductDetailsProps) => (
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
              <ProductPrice price={productCard.price} />
              <ProductRating
                sellerName={sellerName}
                rating={averageRating}
                reviewsCount={127}
              />
            </Stack>

            <Box sx={{ pt: { xs: 1, sm: 2 } }}>
              <AddToCartButton productId={productCard.id} />
            </Box>

            <DescriptionSection description={productCard.description} />

            {isDesktop && (
              <ProductCharacteristics
                characteristics={[]}
                productId={productCard.id}
                categoryName={productCard.category.name}
              />
            )}
          </Stack>
        </Grid>
      </Grid>

      <Box sx={{ mt: { xs: 4, sm: 6, md: 8 } }}>
        <RelatedProducts categoryId={productCard.category.id} />
      </Box>
    </Container>
  )
);

DesktopProductDetails.displayName = "DesktopProductDetails";

interface DescriptionSectionProps {
  description: string;
}
const DescriptionSection = memo(({ description }: DescriptionSectionProps) => (
  <Paper
    elevation={0}
    sx={{
      borderRadius: { xs: 2, sm: 2.5 },
      overflow: "hidden",
      mb: { xs: 1.5, sm: 0 },
    }}
  >
    <Box p={{ xs: 1.5, sm: 2, md: 3 }}>
      <Typography
        variant="h6"
        fontWeight="bold"
        gutterBottom
        sx={{ fontSize: { xs: "1rem", sm: "1.125rem", md: "1.25rem" } }}
      >
        Описание
      </Typography>
      <ProductDescription description={description} />
    </Box>
  </Paper>
));

DescriptionSection.displayName = "DescriptionSection";

interface FixedBottomCartProps {
  productId: number;
}

const FixedBottomCart = memo(({ productId }: FixedBottomCartProps) => (
  <Paper
    elevation={2}
    sx={{
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      zIndex: 10,
      borderRadius: "20px 20px 0 0",
      p: "12px",
      boxShadow: "0px -2px 10px rgba(0, 0, 0, 0.1)",
    }}
  >
    <AddToCartButton productId={productId} />
  </Paper>
));

FixedBottomCart.displayName = "FixedBottomCart";

"use client";

import { Container, useTheme, useMediaQuery } from "@mui/material";
import { useProductDetails, ProductDetailsSkeleton } from "@/entities/product";
import { MobileProductDetails } from "./MobileProductDetails";
import { DesktopProductDetails } from "./DesktopProductDetails";

export function ProductDetailsWidget() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const {
    productCard,
    allImages,
    isLoading,
    isError,
    averageRating,
    sellerName,
  } = useProductDetails();

  if (isLoading) {
    return <ProductDetailsSkeleton />;
  }

  if (isError || !productCard) {
    return <Container maxWidth="lg" sx={{ pt: { xs: 1, sm: 2, md: 3 } }} />;
  }

  const commonProps = {
    productCard,
    allImages,
    averageRating,
    sellerName,
  };

  return isMobile ? (
    <MobileProductDetails {...commonProps} />
  ) : (
    <DesktopProductDetails {...commonProps} />
  );
}

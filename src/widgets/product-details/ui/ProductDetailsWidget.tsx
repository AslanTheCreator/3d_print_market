"use client";

import {
  Button,
  Container,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useProductDetails, ProductDetailsSkeleton } from "@/entities/product";
import { ErrorState } from "@/shared/ui/states";
import { MobileProductDetails } from "./MobileProductDetails";
import { DesktopProductDetails } from "./DesktopProductDetails";

export function ProductDetailsWidget() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useRouter();

  const { productCard, allImages, isLoading, isError } = useProductDetails();

  if (isLoading) {
    return <ProductDetailsSkeleton />;
  }

  if (isError || !productCard) {
    return (
      <Container maxWidth="lg" sx={{ pt: { xs: 1, sm: 2, md: 3 } }}>
        <ErrorState
          type="products"
          title="Не удалось открыть товар"
          description="Товар не найден, был удален или временно недоступен. Попробуйте обновить страницу или вернуться к просмотру каталога."
          onRetry={() => router.refresh()}
          retryText="Обновить"
          actions={
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              width={{ xs: "100%", sm: "auto" }}
            >
              <Button
                variant="contained"
                onClick={() => router.push("/")}
                fullWidth={isMobile}
              >
                На главную
              </Button>
            </Stack>
          }
        />
      </Container>
    );
  }

  const commonProps = {
    productCard,
    allImages,
  };

  return isMobile ? (
    <MobileProductDetails {...commonProps} />
  ) : (
    <DesktopProductDetails {...commonProps} />
  );
}

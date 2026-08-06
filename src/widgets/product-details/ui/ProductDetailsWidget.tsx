"use client";

import {
  Button,
  Container,
  Stack,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useProductDetails } from "@/entities/product";
import type { ProductDetail } from "@/entities/product";
import { ErrorState } from "@/shared/ui/states";
import { ProductDetailsContent } from "./ProductDetailsContent";

interface ProductDetailsWidgetProps {
  productId?: string;
  initialProduct?: ProductDetail;
  initialDataUpdatedAt?: number;
  initialError?: boolean;
}

export function ProductDetailsWidget({
  productId,
  initialProduct,
  initialDataUpdatedAt,
  initialError,
}: ProductDetailsWidgetProps) {
  const router = useRouter();

  const { productCard, allImages, isError } = useProductDetails({
    productId,
    initialProduct,
    initialDataUpdatedAt,
    initialError,
  });

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
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                На главную
              </Button>
            </Stack>
          }
        />
      </Container>
    );
  }

  return (
    <ProductDetailsContent productCard={productCard} allImages={allImages} />
  );
}

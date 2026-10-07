"use client";

import {
  Button,
  Container,
  Stack,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
  const [isRefreshing, startRefresh] = useTransition();

  const { productCard, allImages, isError, isNotFound, refetch, isFetching } = useProductDetails({
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
          title={isNotFound ? "Товар не найден" : "Не удалось открыть товар"}
          description={isNotFound ? "Товар больше недоступен. Вернитесь к просмотру каталога." : "Не удалось загрузить товар. Попробуйте обновить страницу или вернуться к просмотру каталога."}
          onRetry={isNotFound ? undefined : initialError
            ? () => startRefresh(() => router.refresh())
            : () => void refetch()}
          retryPending={isFetching || isRefreshing}
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

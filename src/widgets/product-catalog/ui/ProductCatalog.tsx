"use client";

import React from "react";
import { Box } from "@mui/material";
import {
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  ProductGridItem,
} from "@/entities/product";
import { useFavoritesChecks } from "@/entities/favorite";
import { Product } from "@/entities/product";
import { FavoriteButton } from "@/features/toggle-favorite";
import { AddToCartButton } from "@/features/add-to-cart";
import { ExternalPurchaseButton } from "@/features/external-purchase";
import { useProfileUser } from "@/entities/user";
import { ErrorState, EmptyCatalogState } from "@/shared/ui/states";
import { useRouter } from "next/navigation";
import { useAuth } from "@/entities/session";

interface ProductCatalogProps {
  products: Product[];
  leadingContent?: React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  leadingContent,
  isLoading,
  isError,
  onRetry,
}) => {
  const { isAuthenticated } = useAuth();
  const hasExternalProducts = products.some(
    (product) => product.availability === "EXTERNAL_ONLY",
  );
  const {
    data: currentUser,
    isPending: isOwnerCheckPending,
    isError: isOwnerCheckError,
  } = useProfileUser({
    enabled: isAuthenticated && hasExternalProducts,
  });
  const isOwnerCheckUnavailable =
    isAuthenticated &&
    hasExternalProducts &&
    (isOwnerCheckPending || isOwnerCheckError);
  const router = useRouter();
  const { isProductInFavorites } = useFavoritesChecks(isAuthenticated);

  const handleCardClick = (productId: number) => {
    router.push(`/catalog/${productId}/detail`);
  };

  if (isLoading) {
    return (
      <Box>
        <ProductGrid>
          {leadingContent}
          {Array.from({ length: 12 }).map((_, index) => (
            <ProductGridItem
              key={index}
              sx={{
                display: {
                  xs: index < 6 ? "block" : "none",
                  sm: index < 8 ? "block" : "none",
                  md: "block",
                },
              }}
            >
              <ProductCardSkeleton />
            </ProductGridItem>
          ))}
        </ProductGrid>
      </Box>
    );
  }

  if (isError) {
    return <ErrorState type="products" onRetry={onRetry} />;
  }

  if (!products || products.length === 0) {
    if (leadingContent) {
      return (
        <Box>
          <ProductGrid>{leadingContent}</ProductGrid>
        </Box>
      );
    }

    return (
      <EmptyCatalogState
        type="empty"
        title="Товары не найдены"
        description="К сожалению, сейчас нет доступных предзаказов. Попробуйте вернуться позже или обновить страницу."
        actionLabel="Обновить"
        onAction={onRetry}
      />
    );
  }

  return (
    <Box>
      <ProductGrid>
        {leadingContent}
        {products.map((product) => (
          <ProductGridItem key={product.id}>
            <Box sx={{ position: "relative" }}>
              <ProductCard
                {...product}
                onCardClick={() => handleCardClick(product.id)}
                actions={
                  product.availability === "EXTERNAL_ONLY" ? (
                    <ExternalPurchaseButton
                      externalUrl={product.externalUrl}
                      label={
                        isAuthenticated &&
                        currentUser?.id === product.sellerId
                          ? "Ваш товар"
                          : isOwnerCheckError
                            ? "Недоступно"
                            : "Купить"
                      }
                      disabled={
                        isOwnerCheckUnavailable ||
                        (isAuthenticated &&
                          currentUser?.id === product.sellerId)
                      }
                    />
                  ) : (
                    <AddToCartButton
                      productId={product.id}
                      sellerId={product.sellerId}
                      availability={product.availability}
                      productName={product.name}
                      stockCount={product.count}
                    />
                  )
                }
              />
              <FavoriteButton
                productId={product.id}
                isFavorite={isProductInFavorites(product.id)}
                productName={product.name}
              />
            </Box>
          </ProductGridItem>
        ))}
      </ProductGrid>
    </Box>
  );
};

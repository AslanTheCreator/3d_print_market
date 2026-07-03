"use client";

import dynamic from "next/dynamic";
import {
  Box,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Schedule } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { AddToCartButton } from "@/features/add-to-cart";
import { useAuth } from "@/features/auth";
import { FavoriteButton } from "@/features/toggle-favorite";
import { buildCategoryPath } from "@/entities/category";
import { useFavoritesChecks } from "@/entities/favorite";
import { ImageGallery } from "@/shared/ui/image-gallery";
import type { ImageGalleryImage } from "@/shared/ui/image-gallery";
import { ProductDetail } from "@/shared/types";
import { DeferredProductSection } from "./DeferredProductSection";
import { ProductDescription } from "./ProductDescription";
import { ProductCategoryChips } from "./ProductCategoryChips";
import { ProductDetailsBreadcrumbs } from "./ProductDetailsBreadcrumbs";
import { ProductPriceCardContainer } from "./ProductPriceCardContainer";
import { ProductSellerCard } from "./ProductSellerCard";
import { ProductStockIndicator } from "./ProductStockIndicator";
import { ProductTitle } from "./ProductTitle";
import {
  formatMoney,
  formatStockCount,
  getSellerCardMeta,
} from "./productDetailsFormatters";

const LazyProductReviewsSection = dynamic(
  () =>
    import("./ProductReviewsSection").then(
      (module) => module.ProductReviewsSection,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

const LazyRelatedProducts = dynamic(
  () => import("./RelatedProducts").then((module) => module.RelatedProducts),
  {
    ssr: false,
    loading: () => null,
  },
);

interface DesktopProductDetailsProps {
  productCard: ProductDetail;
  allImages: ImageGalleryImage[];
}

const PriceSection = ({
  price,
  prepaymentAmount,
  availability,
  stockCount,
  currency,
}: {
  price: number;
  prepaymentAmount: number;
  availability: ProductDetail["availability"];
  stockCount: number | null;
  currency: ProductDetail["currency"];
}) => {
  const isPreorder = availability === "PREORDER";

  return (
    <ProductPriceCardContainer
      elevation={0}
      isPreorder={isPreorder}
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isPreorder && (
        <Chip
          icon={<Schedule sx={{ fontSize: 18 }} />}
          label="Предзаказ"
          color="warning"
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            fontWeight: 700,
            fontSize: "0.75rem",
          }}
        />
      )}

      <Stack spacing={2}>
        {isPreorder ? (
          <>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                К оплате сейчас
              </Typography>
              <Typography
                variant="h3"
                color="text.primary"
                sx={{ fontWeight: 800, lineHeight: 1.05, mt: 0.5 }}
              >
                {formatMoney(prepaymentAmount, currency)}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                Полная стоимость
              </Typography>
              <Typography
                variant="h6"
                color="text.primary"
                sx={{ fontWeight: 700, mt: 0.5 }}
              >
                {formatMoney(price, currency)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Остаток после предоплаты:{" "}
                {formatMoney(price - prepaymentAmount, currency)}
              </Typography>
            </Box>
          </>
        ) : (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Цена
            </Typography>
            <Typography
              variant="h3"
              color="text.primary"
              sx={{ fontWeight: 800, lineHeight: 1.05, mt: 0.5 }}
            >
              {formatMoney(price, currency)}
            </Typography>
          </Box>
        )}

        <Divider />

        <ProductStockIndicator
          stockCount={stockCount}
          label={formatStockCount(stockCount)}
          iconSize={20}
          textVariant="body2"
        />
      </Stack>
    </ProductPriceCardContainer>
  );
};

export function DesktopProductDetails({
  productCard,
  allImages,
}: DesktopProductDetailsProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isProductInFavorites } = useFavoritesChecks(isAuthenticated);
  const primaryCategoryId = productCard.categories[0]?.id;
  const sellerCardMeta = getSellerCardMeta(
    productCard.totalReviews,
    productCard.sellerRating,
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <ProductDetailsBreadcrumbs categories={productCard.categories} />

      <ProductTitle
        title={productCard.name}
        variant="h3"
        fontWeight={800}
        sx={{
          mb: 3,
          lineHeight: 1.15,
        }}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Box sx={{ position: "sticky", top: 24 }}>
            <ImageGallery images={allImages} alt={productCard.name} />
          </Box>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <ProductCategoryChips
                categories={productCard.categories}
                onCategoryClick={(category) =>
                  router.push(buildCategoryPath([], category))
                }
              />
            </Stack>

            <PriceSection
              price={productCard.price}
              prepaymentAmount={productCard.prepaymentAmount}
              availability={productCard.availability}
              stockCount={productCard.count}
              currency={productCard.currency}
            />

            <ProductSellerCard
              participantId={productCard.participantId}
              sellerLogin={productCard.sellerLogin}
              displayName={productCard.sellerLogin || "Продавец"}
              {...sellerCardMeta}
              avatarSize={44}
              paperSx={{
                p: 1.75,
                borderRadius: 2.5,
                background: "background.paper",
              }}
            />

            <Stack spacing={1.5}>
              <AddToCartButton
                productId={productCard.id}
                sellerId={productCard.participantId}
                availability={productCard.availability}
                variant="detailed"
                productName={productCard.name}
                stockCount={productCard.count}
              />

              <FavoriteButton
                productId={productCard.id}
                isFavorite={isProductInFavorites(productCard.id)}
                productName={productCard.name}
                variant="detailed"
              />
            </Stack>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <ProductDescription
                description={productCard.description}
                titleVariant="h6"
                collapsedLines={5}
              />
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {productCard.reviews.length > 0 ? (
        <Box sx={{ mt: 5 }}>
          <DeferredProductSection rootMargin="900px">
            <LazyProductReviewsSection reviews={productCard.reviews} />
          </DeferredProductSection>
        </Box>
      ) : null}

      {primaryCategoryId ? (
        <Box sx={{ mt: 5 }}>
          <DeferredProductSection rootMargin="900px">
            <LazyRelatedProducts
              categoryId={primaryCategoryId}
              excludeProductId={productCard.id}
            />
          </DeferredProductSection>
        </Box>
      ) : null}
    </Container>
  );
}

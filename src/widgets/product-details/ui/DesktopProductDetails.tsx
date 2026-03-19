"use client";

import {
  alpha,
  Box,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  LocalShipping,
  Schedule,
  Verified,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { AddToCartButton } from "@/features/add-to-cart";
import { useAuth } from "@/features/auth";
import { FavoriteButton } from "@/features/toggle-favorite";
import { buildCategoryPath } from "@/entities/category";
import { useFavoritesChecks } from "@/entities/favorite";
import { ImageGallery } from "@/shared/ui/image-gallery";
import { ProductDetail } from "@/shared/types";
import { RelatedProducts } from "./RelatedProducts";
import { ProductDescription } from "./ProductDescription";
import { ProductCategoryChips } from "./ProductCategoryChips";
import { ProductDetailsBreadcrumbs } from "./ProductDetailsBreadcrumbs";
import { ProductPriceCardContainer } from "./ProductPriceCardContainer";
import { ProductSellerCard } from "./ProductSellerCard";
import { ProductStockIndicator } from "./ProductStockIndicator";
import { ProductTitle } from "./ProductTitle";
import { formatMoney } from "./productDetailsFormatters";

interface DesktopProductDetailsProps {
  productCard: ProductDetail;
  allImages: string[];
}

const formatReviewsLabel = (count: number): string => {
  if (count === 1) return "1 отзыв";
  if (count >= 2 && count <= 4) return `${count} отзыва`;
  return `${count} отзывов`;
};

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

  const formatStockCount = (count: number | null): string => {
    if (count === null) return "∞ в наличии";
    if (count === 0) return "Нет в наличии";
    if (count === 1) return "1 шт. в наличии";
    return `${count} шт. в наличии`;
  };

  return (
    <ProductPriceCardContainer
      elevation={0}
      isPreorder={isPreorder}
      sx={{
        p: 3,
        borderRadius: 3,
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
                color="preorder.main"
                sx={{ fontWeight: 800, lineHeight: 1 }}
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
                variant="h5"
                color="text.primary"
                sx={{ fontWeight: 700 }}
              >
                {formatMoney(price, currency)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
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
              color="primary.main"
              sx={{ fontWeight: 800, lineHeight: 1 }}
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

const InfoBadges = ({ product }: { product: ProductDetail }) => {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Chip
        icon={<Verified sx={{ fontSize: 18 }} />}
        label={product.originality}
        size="small"
        variant="outlined"
        color="success"
        sx={{ fontWeight: 600 }}
      />

      <Chip
        icon={<LocalShipping sx={{ fontSize: 18 }} />}
        label="Доставка по РФ"
        size="small"
        variant="outlined"
        sx={{ fontWeight: 600 }}
      />
    </Stack>
  );
};

export function DesktopProductDetails({
  productCard,
  allImages,
}: DesktopProductDetailsProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isProductInFavorites } = useFavoritesChecks(isAuthenticated);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <ProductDetailsBreadcrumbs
        productName={productCard.name}
        categories={productCard.categories}
      />

      <ProductTitle
        title={productCard.name}
        variant="h3"
        fontWeight={800}
        sx={{
          mb: 4,
        }}
      />

      <Grid container spacing={4}>
        <Grid item xs={12} lg={7}>
          <Box sx={{ position: "sticky", top: 24 }}>
            <ImageGallery images={allImages} alt={productCard.name} />
          </Box>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            <InfoBadges product={productCard} />

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
              hasRating={productCard.totalReviews > 0}
              ratingLabel={
                productCard.totalReviews > 0
                  ? `${productCard.sellerRating.toFixed(1)}`
                  : "Без оценок"
              }
              reviewsLabel={
                productCard.totalReviews > 0
                  ? formatReviewsLabel(productCard.totalReviews)
                  : "нет отзывов"
              }
              avatarSize={44}
              paperSx={{
                p: 2,
                borderRadius: 2.5,
                background: (theme) => alpha(theme.palette.primary.main, 0.025),
              }}
            />

            <Stack spacing={2}>
              <AddToCartButton
                productId={productCard.id}
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
                p: 3,
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

      <Box sx={{ mt: 6 }}>
        <RelatedProducts
          categoryId={productCard.categories[0]?.id}
          excludeProductId={productCard.id}
        />
      </Box>
    </Container>
  );
}

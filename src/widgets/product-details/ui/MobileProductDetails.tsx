"use client";

import {
  alpha,
  Box,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowBackIosNew, Schedule, Verified } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { AddToCartButton } from "@/features/add-to-cart";
import { useAuth } from "@/features/auth";
import { useFavoritesChecks } from "@/entities/favorite";
import { buildCategoryPath } from "@/entities/category";
import { FavoriteButton } from "@/features/toggle-favorite";
import { ImageGallery } from "@/shared/ui/image-gallery";
import { ProductDetail } from "@/shared/types";
import { RelatedProducts } from "./RelatedProducts";
import { ProductDescription } from "./ProductDescription";
import { ProductCategoryChips } from "./ProductCategoryChips";
import { ProductPriceCardContainer } from "./ProductPriceCardContainer";
import { ProductSellerCard } from "./ProductSellerCard";
import { ProductStockIndicator } from "./ProductStockIndicator";
import { ProductTitle } from "./ProductTitle";
import { formatMoney, formatReviewsLabel } from "./productDetailsFormatters";

interface MobileProductDetailsProps {
  productCard: ProductDetail;
  allImages: string[];
}

const formatStockCount = (count: number | null): string => {
  if (count === null) return "∞ в наличии";
  if (count === 0) return "Нет в наличии";
  if (count === 1) return "1 шт.";
  return `${count} шт.`;
};

const MobileBottomBar = ({
  productId,
  availability,
  productName,
  stockCount,
  price,
  prepaymentAmount,
  currency,
}: {
  productId: number;
  availability: ProductDetail["availability"];
  productName: string;
  stockCount: number | null;
  price: number;
  prepaymentAmount: number;
  currency: ProductDetail["currency"];
}) => {
  const isPreorder = availability === "PREORDER";
  const priceValue = isPreorder ? prepaymentAmount : price;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        px: 2,
        pt: 1.25,
        pb: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        zIndex: 1000,
        borderRadius: "24px 24px 0 0",
        background: (theme) => theme.palette.background.paper,
        boxShadow: "0 -10px 32px rgba(15, 23, 42, 0.12)",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack spacing={1.25}>
        <Box minWidth={0}>
          {isPreorder && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Предоплата сейчас
            </Typography>
          )}
          <Typography
            variant="h5"
            sx={{
              mt: isPreorder ? 0.25 : 0,
              fontWeight: 800,
              lineHeight: 1.1,
              color: isPreorder ? "preorder.main" : "primary.main",
            }}
          >
            {formatMoney(priceValue, currency)}
          </Typography>
          {isPreorder && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              Полная стоимость: {formatMoney(price, currency)}
            </Typography>
          )}
        </Box>

        <AddToCartButton
          productId={productId}
          availability={availability}
          variant="detailed"
          productName={productName}
          stockCount={stockCount}
        />
      </Stack>
    </Paper>
  );
};

const MobilePriceCard = ({
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
      elevation={3}
      isPreorder={isPreorder}
      sx={{
        p: 2,
        borderRadius: 2.5,
      }}
    >
      {isPreorder ? (
        <Stack spacing={1.25}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              К оплате сейчас
            </Typography>
            <Chip
              icon={<Schedule sx={{ fontSize: 14 }} />}
              label="Предзаказ"
              color="warning"
              size="small"
              sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }}
            />
          </Stack>

          <Typography
            variant="h4"
            color="preorder.main"
            sx={{ fontWeight: 800, lineHeight: 1 }}
          >
            {formatMoney(prepaymentAmount, currency)}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Полная цена: <strong>{formatMoney(price, currency)}</strong>
          </Typography>

          <Divider />

          <ProductStockIndicator
            stockCount={stockCount}
            label={formatStockCount(stockCount)}
            iconSize={16}
            textVariant="caption"
          />
        </Stack>
      ) : (
        <Stack spacing={1.25}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            Цена
          </Typography>
          <Typography
            variant="h4"
            color="primary.main"
            sx={{ fontWeight: 800, lineHeight: 1 }}
          >
            {formatMoney(price, currency)}
          </Typography>

          <ProductStockIndicator
            stockCount={stockCount}
            label={formatStockCount(stockCount)}
            iconSize={16}
            textVariant="caption"
          />
        </Stack>
      )}
    </ProductPriceCardContainer>
  );
};

export function MobileProductDetails({
  productCard,
  allImages,
}: MobileProductDetailsProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isProductInFavorites } = useFavoritesChecks(isAuthenticated);
  const primaryCategoryId = productCard.categories[0]?.id;
  const handleBackClick = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <Box sx={{ pb: 24 }}>
      <Box sx={{ mb: 2, position: "relative" }}>
        <ImageGallery images={allImages} alt={productCard.name} />

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            zIndex: 2,
          }}
        >
          <IconButton
            onClick={handleBackClick}
            aria-label="Назад"
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.92),
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
              border: "1px solid",
              borderColor: (theme) => alpha(theme.palette.common.black, 0.08),
              color: "text.primary",
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.background.paper, 0.98),
              },
            }}
          >
            <ArrowBackIosNew sx={{ fontSize: 18 }} />
          </IconButton>

          <FavoriteButton
            productId={productCard.id}
            isFavorite={isProductInFavorites(productCard.id)}
            productName={productCard.name}
            variant="overlay"
          />
        </Stack>
      </Box>

      <Box sx={{ px: 2 }}>
        <ProductTitle
          variant="h5"
          fontWeight={800}
          sx={{
            mb: 2,
            lineHeight: 1.3,
          }}
          title={productCard.name}
        />

        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          <ProductCategoryChips
            categories={productCard.categories}
            onCategoryClick={(category) =>
              router.push(buildCategoryPath([], category))
            }
          />
          <Chip
            icon={<Verified sx={{ fontSize: 14 }} />}
            label={productCard.originality}
            size="small"
            variant="outlined"
            color="success"
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        <MobilePriceCard
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
          avatarSize={40}
          rootSpacing={1.25}
          paperSx={{
            p: 1.5,
            mt: 2,
            borderRadius: 2.5,
            background: (theme) => alpha(theme.palette.primary.main, 0.025),
          }}
        />

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            mt: 2,
          }}
        >
          <ProductDescription
            description={productCard.description}
            titleVariant="subtitle2"
            collapsedLines={4}
          />
        </Paper>

        {primaryCategoryId ? (
          <Box sx={{ mt: 3 }}>
            <RelatedProducts
              categoryId={primaryCategoryId}
              excludeProductId={productCard.id}
            />
          </Box>
        ) : null}
      </Box>

      <MobileBottomBar
        productId={productCard.id}
        availability={productCard.availability}
        productName={productCard.name}
        stockCount={productCard.count}
        price={productCard.price}
        prepaymentAmount={productCard.prepaymentAmount}
        currency={productCard.currency}
      />
    </Box>
  );
}

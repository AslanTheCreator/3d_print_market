"use client";

import dynamic from "next/dynamic";
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
import { ArrowBackIosNew, Schedule } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { AddToCartButton } from "@/features/add-to-cart";
import { ExternalPurchaseButton } from "@/features/external-purchase";
import { useAuth } from "@/entities/session";
import { useFavoritesChecks } from "@/entities/favorite";
import { useProfileUser } from "@/entities/user";
import { buildCategoryPath } from "@/entities/category";
import { FavoriteButton } from "@/features/toggle-favorite";
import { ImageGallery } from "@/shared/ui/image-gallery";
import type { ImageGalleryImage } from "@/shared/ui/image-gallery";
import { ProductDetail } from "@/entities/product";
import { DeferredProductSection } from "./DeferredProductSection";
import { ProductDescription } from "./ProductDescription";
import { ProductCategoryChips } from "./ProductCategoryChips";
import { ProductPriceCardContainer } from "./ProductPriceCardContainer";
import { ProductSellerCard } from "./ProductSellerCard";
import { ProductStockIndicator } from "./ProductStockIndicator";
import { ProductTitle } from "./ProductTitle";
import {
  formatMoney,
  formatStockCount,
  getSellerCardMeta,
} from "./productDetailsFormatters";

const LazyMobileProductReviewsSection = dynamic(
  () =>
    import("./MobileProductReviewsSection").then(
      (module) => module.MobileProductReviewsSection,
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

interface MobileProductDetailsProps {
  productCard: ProductDetail;
  allImages: ImageGalleryImage[];
}

const MobileBottomBar = ({
  productId,
  sellerId,
  availability,
  externalUrl,
  isOwnProduct,
  isOwnerCheckUnavailable,
  isOwnerCheckError,
  productName,
  stockCount,
  price,
  prepaymentAmount,
  currency,
}: {
  productId: number;
  sellerId: number;
  availability: ProductDetail["availability"];
  externalUrl: string;
  isOwnProduct: boolean;
  isOwnerCheckUnavailable: boolean;
  isOwnerCheckError: boolean;
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
        pt: 1,
        pb: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        zIndex: 1000,
        borderRadius: "20px 20px 0 0",
        background: (theme) => theme.palette.background.paper,
        boxShadow: "0 -8px 24px rgba(15, 23, 42, 0.10)",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack spacing={1}>
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
              color: "text.primary",
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

        {availability === "EXTERNAL_ONLY" ? (
          <ExternalPurchaseButton
            externalUrl={externalUrl}
            label={
              isOwnProduct
                ? "Ваш товар"
                : isOwnerCheckError
                  ? "Недоступно"
                  : "Добавить в корзину"
            }
            variant="detailed"
            disabled={isOwnProduct || isOwnerCheckUnavailable}
          />
        ) : (
          <AddToCartButton
            productId={productId}
            sellerId={sellerId}
            availability={availability}
            variant="detailed"
            productName={productName}
            stockCount={stockCount}
          />
        )}
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
        p: 1.75,
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
            color="text.primary"
            sx={{ fontWeight: 800, lineHeight: 1.05 }}
          >
            {formatMoney(prepaymentAmount, currency)}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Полная цена: <strong>{formatMoney(price, currency)}</strong>
          </Typography>

          <Divider />

          <ProductStockIndicator
            stockCount={stockCount}
            label={formatStockCount(stockCount, "compact")}
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
            color="text.primary"
            sx={{ fontWeight: 800, lineHeight: 1.05 }}
          >
            {formatMoney(price, currency)}
          </Typography>

          <ProductStockIndicator
            stockCount={stockCount}
            label={formatStockCount(stockCount, "compact")}
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
  const {
    data: currentUser,
    isPending: isOwnerCheckPending,
    isError: isOwnerCheckError,
  } = useProfileUser({
    enabled:
      isAuthenticated && productCard.availability === "EXTERNAL_ONLY",
  });
  const isOwnerCheckUnavailable =
    isAuthenticated &&
    productCard.availability === "EXTERNAL_ONLY" &&
    (isOwnerCheckPending || isOwnerCheckError);
  const { isProductInFavorites } = useFavoritesChecks(isAuthenticated);
  const primaryCategoryId = productCard.categories[0]?.id;
  const sellerCardMeta = getSellerCardMeta(
    productCard.totalReviews,
    productCard.sellerRating,
  );
  const handleBackClick = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <Box sx={{ pb: 24 }}>
      <Box sx={{ mb: 1.5, position: "relative" }}>
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
          fontWeight={700}
          sx={{
            mb: 1.5,
            lineHeight: 1.3,
          }}
          title={productCard.name}
        />

        <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
          <ProductCategoryChips
            categories={productCard.categories}
            onCategoryClick={(category) =>
              router.push(buildCategoryPath([], category))
            }
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
          {...sellerCardMeta}
          avatarSize={40}
          rootSpacing={1.25}
          paperSx={{
            p: 1.5,
            mt: 1.5,
            borderRadius: 2.5,
            background: "background.paper",
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
            mt: 1.5,
          }}
        >
          <ProductDescription
            description={productCard.description}
            titleVariant="subtitle2"
            collapsedLines={4}
          />
        </Paper>

        {productCard.reviews.length > 0 ? (
          <DeferredProductSection rootMargin="800px">
            <LazyMobileProductReviewsSection reviews={productCard.reviews} />
          </DeferredProductSection>
        ) : null}

        {primaryCategoryId ? (
          <Box sx={{ mt: 2.5 }}>
            <DeferredProductSection rootMargin="800px">
              <LazyRelatedProducts
                categoryId={primaryCategoryId}
                excludeProductId={productCard.id}
              />
            </DeferredProductSection>
          </Box>
        ) : null}
      </Box>

      <MobileBottomBar
        productId={productCard.id}
        sellerId={productCard.participantId}
        availability={productCard.availability}
        externalUrl={productCard.externalUrl}
        isOwnProduct={
          isAuthenticated && currentUser?.id === productCard.participantId
        }
        isOwnerCheckUnavailable={isOwnerCheckUnavailable}
        isOwnerCheckError={isOwnerCheckError}
        productName={productCard.name}
        stockCount={productCard.count}
        price={productCard.price}
        prepaymentAmount={productCard.prepaymentAmount}
        currency={productCard.currency}
      />
    </Box>
  );
}

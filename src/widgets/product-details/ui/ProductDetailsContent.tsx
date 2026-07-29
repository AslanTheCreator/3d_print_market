"use client";

import dynamic from "next/dynamic";
import { ArrowBackIosNew, Schedule } from "@mui/icons-material";
import {
  alpha,
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { buildCategoryPath } from "@/entities/category";
import { useFavoritesChecks } from "@/entities/favorite";
import type { ProductDetail } from "@/entities/product";
import { useAuth } from "@/entities/session";
import { useProfileUser } from "@/entities/user";
import { AddToCartButton } from "@/features/add-to-cart";
import { ExternalPurchaseButton } from "@/features/external-purchase";
import { FavoriteButton } from "@/features/toggle-favorite";
import {
  ImageGallery,
  type ImageGalleryImage,
} from "@/shared/ui/image-gallery";
import { DeferredProductSection } from "./DeferredProductSection";
import { ProductCategoryChips } from "./ProductCategoryChips";
import { ProductDescription } from "./ProductDescription";
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

interface ProductDetailsContentProps {
  productCard: ProductDetail;
  allImages: ImageGalleryImage[];
}

interface ProductPriceSectionProps {
  price: number;
  prepaymentAmount: number;
  availability: ProductDetail["availability"];
  stockCount: number | null;
  currency: ProductDetail["currency"];
}

function ProductPriceSection({
  price,
  prepaymentAmount,
  availability,
  stockCount,
  currency,
}: ProductPriceSectionProps) {
  const isPreorder = availability === "PREORDER";

  return (
    <ProductPriceCardContainer
      elevation={0}
      isPreorder={isPreorder}
      sx={{
        p: { xs: 1.75, sm: 2.5 },
        borderRadius: 2.5,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isPreorder ? (
        <Chip
          icon={<Schedule sx={{ fontSize: { xs: 14, sm: 18 } }} />}
          label="Предзаказ"
          color="warning"
          size="small"
          sx={{
            position: "absolute",
            top: { xs: 12, sm: 12 },
            right: { xs: 12, sm: 12 },
            height: { xs: 20, sm: 24 },
            fontWeight: 700,
            fontSize: { xs: "0.65rem", sm: "0.75rem" },
          }}
        />
      ) : null}

      <Stack spacing={{ xs: 1.25, sm: 2 }}>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            {isPreorder ? "К оплате сейчас" : "Цена"}
          </Typography>
          <Typography
            component="p"
            variant="h3"
            color="text.primary"
            sx={{
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
              fontWeight: 800,
              lineHeight: 1.05,
              mt: { xs: 0, sm: 0.5 },
            }}
          >
            {formatMoney(isPreorder ? prepaymentAmount : price, currency)}
          </Typography>
        </Box>

        {isPreorder ? (
          <>
            <Divider sx={{ display: { xs: "none", sm: "block" } }} />

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: "block", sm: "none" } }}
              >
                Полная цена:{" "}
                <Box component="strong" sx={{ color: "text.primary" }}>
                  {formatMoney(price, currency)}
                </Box>
              </Typography>

              <Box sx={{ display: { xs: "none", sm: "block" } }}>
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
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.25 }}
                >
                  Остаток после предоплаты:{" "}
                  {formatMoney(price - prepaymentAmount, currency)}
                </Typography>
              </Box>
            </Box>
          </>
        ) : null}

        <Divider sx={{ display: isPreorder ? "block" : { xs: "none", sm: "block" } }} />

        <ProductStockIndicator
          stockCount={stockCount}
          compactLabel={formatStockCount(stockCount, "compact")}
          label={formatStockCount(stockCount)}
        />
      </Stack>
    </ProductPriceCardContainer>
  );
}

interface ProductPurchaseActionProps {
  product: ProductDetail;
  isOwnProduct: boolean;
  isOwnerCheckUnavailable: boolean;
  isOwnerCheckError: boolean;
}

function ProductPurchaseAction({
  product,
  isOwnProduct,
  isOwnerCheckUnavailable,
  isOwnerCheckError,
}: ProductPurchaseActionProps) {
  const isPreorder = product.availability === "PREORDER";
  const currentPrice = isPreorder
    ? product.prepaymentAmount
    : product.price;

  return (
    <Paper
      data-testid="product-purchase-action"
      elevation={8}
      sx={{
        position: { xs: "fixed", sm: "static" },
        inset: { xs: "auto 0 0", sm: "auto" },
        px: { xs: 2, sm: 0 },
        pt: { xs: 1, sm: 0 },
        pb: {
          xs: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          sm: 0,
        },
        zIndex: { xs: 1000, sm: "auto" },
        borderRadius: { xs: "20px 20px 0 0", sm: 0 },
        background: { xs: "background.paper", sm: "transparent" },
        boxShadow: {
          xs: "0 -8px 24px rgba(15, 23, 42, 0.10)",
          sm: "none",
        },
        borderTop: { xs: "1px solid", sm: 0 },
        borderColor: "divider",
      }}
    >
      <Stack spacing={1}>
        <Box sx={{ display: { xs: "block", sm: "none" }, minWidth: 0 }}>
          {isPreorder ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Предоплата сейчас
            </Typography>
          ) : null}
          <Typography
            variant="h5"
            sx={{
              mt: isPreorder ? 0.25 : 0,
              fontWeight: 800,
              lineHeight: 1.1,
              color: "text.primary",
            }}
          >
            {formatMoney(currentPrice, product.currency)}
          </Typography>
          {isPreorder ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              Полная стоимость: {formatMoney(product.price, product.currency)}
            </Typography>
          ) : null}
        </Box>

        {product.availability === "EXTERNAL_ONLY" ? (
          <ExternalPurchaseButton
            externalUrl={product.externalUrl}
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
            productId={product.id}
            sellerId={product.participantId}
            availability={product.availability}
            variant="detailed"
            productName={product.name}
            stockCount={product.count}
          />
        )}
      </Stack>
    </Paper>
  );
}

export function ProductDetailsContent({
  productCard,
  allImages,
}: ProductDetailsContentProps) {
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
  const { isProductInFavorites } = useFavoritesChecks(isAuthenticated);

  const isOwnerCheckUnavailable =
    isAuthenticated &&
    productCard.availability === "EXTERNAL_ONLY" &&
    (isOwnerCheckPending || isOwnerCheckError);
  const isOwnProduct =
    isAuthenticated && currentUser?.id === productCard.participantId;
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
    <Box data-testid="product-details" sx={{ pb: { xs: 24, sm: 0 } }}>
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ px: { xs: 2, sm: 4 }, py: { xs: 0, sm: 3 } }}
      >
        <Box
          sx={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "7fr 5fr" },
            gridTemplateAreas: {
              xs: `
                "gallery"
                "title"
                "categories"
                "price"
                "seller"
                "description"
                "reviews"
                "related"
              `,
              sm: `
                "breadcrumbs"
                "title"
                "gallery"
                "categories"
                "price"
                "seller"
                "purchase"
                "favorite"
                "description"
                "reviews"
                "related"
              `,
              lg: `
                "breadcrumbs breadcrumbs"
                "title title"
                "gallery categories"
                "gallery price"
                "gallery seller"
                "gallery purchase"
                "gallery favorite"
                "gallery description"
                "reviews reviews"
                "related related"
              `,
            },
            columnGap: { lg: 3 },
            rowGap: { xs: 1.5, sm: 2.5 },
          }}
        >
          <Box
            sx={{
              gridArea: "breadcrumbs",
              display: { xs: "none", sm: "block" },
              minWidth: 0,
            }}
          >
            <ProductDetailsBreadcrumbs
              categories={productCard.categories}
              mb={0}
            />
          </Box>

          <ProductTitle
            component="h1"
            title={productCard.name}
            variant="h3"
            fontWeight={700}
            sx={{
              gridArea: "title",
              m: 0,
              fontSize: { xs: "1.125rem", sm: "1.5rem" },
              lineHeight: { xs: 1.3, sm: 1.15 },
            }}
          />

          <Box
            data-testid="product-gallery"
            sx={{
              gridArea: "gallery",
              minWidth: 0,
              mx: { xs: -2, sm: 0 },
              alignSelf: "stretch",
            }}
          >
            <Box sx={{ position: { lg: "sticky" }, top: { lg: 24 } }}>
              <ImageGallery
                images={allImages}
                alt={productCard.name}
                imageSizes="(max-width: 599px) 100vw, (max-width: 1375px) calc(100vw - 64px), 840px"
              />
            </Box>
          </Box>

          <IconButton
            onClick={handleBackClick}
            aria-label="Назад"
            sx={{
              display: { xs: "inline-flex", sm: "none" },
              position: "absolute",
              top: 16,
              left: 0,
              zIndex: 2,
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

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ gridArea: "categories", minWidth: 0 }}
          >
            <ProductCategoryChips
              categories={productCard.categories}
              onCategoryClick={(category) =>
                router.push(buildCategoryPath([], category))
              }
            />
          </Stack>

          <Box sx={{ gridArea: "price", minWidth: 0 }}>
            <ProductPriceSection
              price={productCard.price}
              prepaymentAmount={productCard.prepaymentAmount}
              availability={productCard.availability}
              stockCount={productCard.count}
              currency={productCard.currency}
            />
          </Box>

          <Box sx={{ gridArea: "seller", minWidth: 0 }}>
            <ProductSellerCard
              participantId={productCard.participantId}
              sellerLogin={productCard.sellerLogin}
              displayName={productCard.sellerLogin || "Продавец"}
              {...sellerCardMeta}
              avatarSize={44}
              compactAvatarSize={40}
              rootSpacing={{ xs: 1.25, sm: 1.5 }}
              paperSx={{
                p: { xs: 1.5, sm: 1.75 },
                borderRadius: 2.5,
                background: "background.paper",
              }}
            />
          </Box>

          <Box
            sx={{
              gridArea: { xs: "unset", sm: "purchase" },
              position: { xs: "absolute", sm: "static" },
              minWidth: 0,
            }}
          >
            <ProductPurchaseAction
              product={productCard}
              isOwnProduct={isOwnProduct}
              isOwnerCheckUnavailable={isOwnerCheckUnavailable}
              isOwnerCheckError={isOwnerCheckError}
            />
          </Box>

          <Box
            data-testid="product-favorite-action"
            sx={{
              gridArea: { xs: "unset", sm: "favorite" },
              position: { xs: "absolute", sm: "static" },
              top: { xs: 16, sm: "auto" },
              right: { xs: 0, sm: "auto" },
              zIndex: { xs: 2, sm: "auto" },
              minWidth: 0,
            }}
          >
            <FavoriteButton
              productId={productCard.id}
              isFavorite={isProductInFavorites(productCard.id)}
              productName={productCard.name}
              variant="product-details"
            />
          </Box>

          <Paper
            elevation={0}
            sx={{
              gridArea: "description",
              minWidth: 0,
              p: { xs: 2, sm: 2.5 },
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

          {productCard.reviews.length > 0 ? (
            <Box
              sx={{
                gridArea: "reviews",
                minWidth: 0,
                mt: { xs: 0.5, sm: 2.5 },
              }}
            >
              <DeferredProductSection rootMargin="900px">
                <LazyProductReviewsSection reviews={productCard.reviews} />
              </DeferredProductSection>
            </Box>
          ) : null}

          {primaryCategoryId ? (
            <Box
              sx={{
                gridArea: "related",
                minWidth: 0,
                mt: { xs: 1, sm: 2.5 },
              }}
            >
              <DeferredProductSection rootMargin="900px">
                <LazyRelatedProducts
                  categoryId={primaryCategoryId}
                  excludeProductId={productCard.id}
                />
              </DeferredProductSection>
            </Box>
          ) : null}
        </Box>
      </Container>
    </Box>
  );
}

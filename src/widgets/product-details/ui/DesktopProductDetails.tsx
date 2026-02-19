"use client";

import {
  Container,
  Typography,
  Grid,
  Stack,
  Box,
  Chip,
  Paper,
  Divider,
  alpha,
} from "@mui/material";
import { ImageGallery } from "@/shared/ui/image-gallery";
import { ProductDetail } from "@/shared/types";
import { RelatedProducts } from "./RelatedProducts";
import { AddToCartButton } from "@/features/cart";
import { FavoriteButton } from "@/features/toggle-favorite";
import {
  Verified,
  LocalShipping,
  Schedule,
  Star,
  Inventory2Outlined,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { buildCategoryPath } from "@/entities/category";

interface DesktopProductDetailsProps {
  productCard: ProductDetail;
  allImages: string[];
}

// Компонент информации о цене
const PriceSection = ({
  price,
  prepaymentAmount,
  availability,
  stockCount,
}: {
  price: number;
  prepaymentAmount: number;
  availability: string;
  stockCount: number | null;
}) => {
  const isPreorder = availability === "PREORDER";

  // Форматирование остатка товара
  const formatStockCount = (count: number | null): string => {
    if (count === null) return "∞ в наличии";
    if (count === 0) return "Нет в наличии";
    if (count === 1) return "1 шт. в наличии";
    return `${count} шт. в наличии`;
  };

  // Определяем цвет для остатка
  const getStockColor = (
    count: number | null,
  ): "success" | "warning" | "error" => {
    if (count === null) return "success";
    if (count === 0) return "error";
    if (count <= 3) return "warning";
    return "success";
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        background: (theme) =>
          `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.05,
          )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        border: "2px solid",
        borderColor: isPreorder ? "preorder.main" : "primary.main",
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
                Предоплата сейчас
              </Typography>
              <Typography
                variant="h3"
                color="preorder.main"
                sx={{ fontWeight: 800, lineHeight: 1 }}
              >
                {prepaymentAmount.toLocaleString("ru-RU")} ₽
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
                {price.toLocaleString("ru-RU")} ₽
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Оплата при получении:{" "}
                {(price - prepaymentAmount).toLocaleString("ru-RU")} ₽
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
              {price.toLocaleString("ru-RU")} ₽
            </Typography>
          </Box>
        )}

        {/* Остаток товара */}
        <Divider />
        <Stack direction="row" spacing={1} alignItems="center">
          <Inventory2Outlined
            sx={{ fontSize: 20 }}
            color={getStockColor(stockCount)}
          />
          <Typography
            variant="body2"
            fontWeight={600}
            color={`${getStockColor(stockCount)}.main`}
          >
            {formatStockCount(stockCount)}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

// Компонент информационных бейджей
const InfoBadges = ({ product }: { product: ProductDetail }) => {
  const isPreorder = product.availability === "PREORDER";

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Хлебные крошки */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Главная / {productCard.categories.map((c) => c.name).join(", ")}
      </Typography>

      {/* Заголовок */}
      <Typography
        variant="h3"
        fontWeight={800}
        sx={{
          mb: 4,
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {productCard.name}
      </Typography>

      <Grid container spacing={4}>
        {/* Левая колонка - Галерея */}
        <Grid item xs={12} lg={7}>
          <Box sx={{ position: "sticky", top: 24 }}>
            <ImageGallery images={allImages} alt={productCard.name} />
          </Box>
        </Grid>

        {/* Правая колонка - Информация */}
        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            {/* Информационные бейджи */}
            <InfoBadges product={productCard} />

            {/* Категории */}
            {productCard.categories.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {productCard.categories.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    size="small"
                    variant="outlined"
                    color="secondary"
                    clickable
                    onClick={() => router.push(buildCategoryPath([], category))}
                    sx={{
                      fontWeight: 600,
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "secondary.main",
                        color: "secondary.contrastText",
                      },
                    }}
                  />
                ))}
              </Stack>
            )}

            {/* Цена и остаток */}
            <PriceSection
              price={productCard.price}
              prepaymentAmount={productCard.prepaymentAmount}
              availability={productCard.availability}
              stockCount={productCard.count}
            />

            {/* Информация о продавце */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "1.25rem",
                  }}
                >
                  {productCard.sellerLogin?.charAt(0) || "S"}
                </Box>
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {productCard.sellerLogin || "Продавец"}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {productCard.sellerRating > 0 &&
                    productCard.totalReviews > 0 ? (
                      <>
                        <Star sx={{ fontSize: 16, color: "warning.main" }} />
                        <Typography variant="body2" fontWeight={600}>
                          {productCard.sellerRating.toFixed(1)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {productCard.totalReviews === 1
                            ? "1 оценка"
                            : productCard.totalReviews < 5
                              ? `${productCard.totalReviews} оценки`
                              : `${productCard.totalReviews} оценок`}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Star sx={{ fontSize: 16, color: "grey.400" }} />
                        <Typography variant="body2" color="text.secondary">
                          Нет оценок
                        </Typography>
                      </>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            {/* Кнопки действий */}
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
                isFavorite={false}
                productName={productCard.name}
              />
            </Stack>

            {/* Описание */}
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
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Описание
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  lineHeight: 1.8,
                  whiteSpace: "pre-line",
                }}
              >
                {productCard.description || "Описание отсутствует"}
              </Typography>
            </Paper>

            {/* Преимущества */}
            {/* <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: alpha("#4caf50", 0.05),
                border: "1px solid",
                borderColor: alpha("#4caf50", 0.2),
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                ✓ Гарантия подлинности
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                ✓ Бесплатная доставка от 3000 ₽
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ✓ Возврат в течение 14 дней
              </Typography>
            </Paper> */}
          </Stack>
        </Grid>
      </Grid>

      {/* Похожие товары */}
      <Box sx={{ mt: 6 }}>
        <RelatedProducts
          categoryId={productCard.categories[0]?.id}
          excludeProductId={productCard.id}
        />
      </Box>
    </Container>
  );
}

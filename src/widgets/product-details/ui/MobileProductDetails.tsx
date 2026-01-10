"use client";

import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  Divider,
  alpha,
  Fab,
} from "@mui/material";
import { ImageGallery } from "@/shared/ui/image-gallery";
import { ProductDetailsModel } from "@/entities/product";
import { RelatedProducts } from "./RelatedProducts";
import { AddToCartButton } from "@/features/cart";
import { FavoriteButton } from "@/features/toggle-favorite";
import {
  Verified,
  LocalShipping,
  Schedule,
  Star,
  Favorite,
  FavoriteBorder,
} from "@mui/icons-material";

interface MobileProductDetailsProps {
  productCard: ProductDetailsModel;
  allImages: string[];
}

// Компактная версия цены для мобильных
const MobilePriceCard = ({
  price,
  prepaymentAmount,
  availability,
}: {
  price: number;
  prepaymentAmount: number;
  availability: string;
}) => {
  const isPreorder = availability === "PREORDER";

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 2.5,
        background: (theme) =>
          `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.08
          )} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
        border: "2px solid",
        borderColor: isPreorder ? "preorder.main" : "primary.main",
      }}
    >
      {isPreorder ? (
        <Stack spacing={1}>
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
              Предоплата
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
            {prepaymentAmount.toLocaleString("ru-RU")} ₽
          </Typography>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Полная цена: <strong>{price.toLocaleString("ru-RU")} ₽</strong>
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Stack>
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
            {price.toLocaleString("ru-RU")} ₽
          </Typography>
        </Stack>
      )}
    </Paper>
  );
};

export function MobileProductDetails({
  productCard,
  allImages,
}: MobileProductDetailsProps) {
  return (
    <Box sx={{ pb: 12 }}>
      {/* Галерея */}
      <Box sx={{ mb: 2 }}>
        <ImageGallery images={allImages} alt={productCard.name} />
      </Box>

      {/* Основной контент */}
      <Box sx={{ px: 2 }}>
        {/* Заголовок */}
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{
            mb: 2,
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.3,
          }}
        >
          {productCard.name}
        </Typography>

        {/* Категория и бейджи */}
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          <Chip
            label={productCard.categories[0]?.name}
            size="small"
            variant="outlined"
            color="secondary"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<Verified sx={{ fontSize: 14 }} />}
            label={productCard.originality}
            size="small"
            variant="outlined"
            color="success"
            sx={{ fontWeight: 600 }}
          />
          {productCard.count > 0 && (
            <Chip
              label={`${productCard.count} шт`}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Stack>

        {/* Цена */}
        <MobilePriceCard
          price={productCard.price}
          prepaymentAmount={productCard.prepaymentAmount}
          availability={productCard.availability}
        />

        {/* Продавец */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            mt: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: "1.125rem",
              }}
            >
              {productCard.sellerLogin?.charAt(0) || "S"}
            </Box>
            <Box flex={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                {productCard.sellerLogin || "Продавец"}
              </Typography>
              {productCard.sellerRating && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Star sx={{ fontSize: 14, color: "warning.main" }} />
                  <Typography variant="caption" fontWeight={600}>
                    {productCard.sellerRating.toFixed(1)}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Stack>
        </Paper>

        {/* Описание */}
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
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Описание
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              lineHeight: 1.7,
              whiteSpace: "pre-line",
            }}
          >
            {productCard.description || "Описание отсутствует"}
          </Typography>
        </Paper>

        {/* Преимущества */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: alpha("#4caf50", 0.05),
            border: "1px solid",
            borderColor: alpha("#4caf50", 0.2),
            mt: 2,
          }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            display="block"
            gutterBottom
          >
            ✓ Гарантия подлинности
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            gutterBottom
          >
            ✓ Бесплатная доставка от 3000 ₽
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            ✓ Возврат в течение 14 дней
          </Typography>
        </Paper>

        {/* Похожие товары */}
        <Box sx={{ mt: 3 }}>
          <RelatedProducts categoryId={productCard.categories[0]?.id} />
        </Box>
      </Box>

      {/* Фиксированная нижняя панель */}
      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          zIndex: 1000,
          borderRadius: "20px 20px 0 0",
          background: (theme) => theme.palette.background.paper,
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ flex: 1 }}>
            <AddToCartButton
              productId={productCard.id}
              availability={productCard.availability}
              variant="detailed"
              productName={productCard.name}
            />
          </Box>
        </Stack>
      </Paper>

      {/* Кнопка избранного */}
      <Fab
        color="primary"
        sx={{
          position: "fixed",
          bottom: 80,
          right: 16,
          boxShadow: "0 4px 16px rgba(247, 110, 160, 0.3)",
        }}
      >
        <FavoriteBorder />
      </Fab>
    </Box>
  );
}

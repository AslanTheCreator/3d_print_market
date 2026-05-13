"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
  Skeleton,
  useTheme,
  alpha,
  useMediaQuery,
  Chip,
} from "@mui/material";
import { Schedule } from "@mui/icons-material";
import { Product } from "@/shared/types";
import { getImageUrl } from "@/shared/lib";
import { ProductPriceDisplay } from "./ProductPriceDisplay";

interface ProductCardProps extends Product {
  actions?: React.ReactNode;
  onCardClick?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  prepaymentAmount,
  categories,
  image,
  availability,
  actions,
  sellerRating,
  totalReviews,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const isPreorder = availability === "PREORDER";
  const productImage = image?.[0] ?? null;
  const productImageSrc = getImageUrl(productImage, "thumbnail");

  return (
    <Card
      sx={{
        maxWidth: "100%",
        width: "100%",
        borderRadius: { xs: 2, sm: 2.5 },
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition:
          "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": {
          transform: { xs: "none", sm: "translateY(-4px)" },
          boxShadow: {
            xs: "0 2px 10px rgba(15, 23, 42, 0.04)",
            sm: "0 12px 24px rgba(15, 23, 42, 0.08)",
          },
          borderColor: alpha(theme.palette.primary.main, 0.18),
          "& .product-card-image": {
            transform: "scale(1.03)",
          },
        },
        bgcolor: "background.paper",
      }}
    >
      <Link
        href={`/catalog/${id}/detail`}
        prefetch={false}
        style={{
          textDecoration: "none",
          color: "inherit",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Блок с изображением */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: isMobile ? "1/1.2" : "1/1.33",
            overflow: "hidden",
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          {productImageSrc ? (
            <>
              {!isImageLoaded && (
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height="100%"
                  animation="wave"
                  sx={{ position: "absolute", top: 0, left: 0 }}
                />
              )}
              <Image
                alt={name}
                src={productImageSrc}
                fill
                sizes="(max-width: 600px) 50vw, 33vw"
                loading="lazy"
                className="product-card-image"
                style={{
                  objectFit: "cover",
                  opacity: isImageLoaded ? 1 : 0,
                  transition: "opacity 0.3s ease, transform 0.25s ease",
                }}
                onLoad={() => setIsImageLoaded(true)}
              />
            </>
          ) : (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
                fontSize: "0.75rem",
              }}
            >
              Изображение недоступно
            </Box>
          )}

          {/* Бейдж предзаказа */}
          {isPreorder && (
            <Chip
              icon={<Schedule sx={{ fontSize: 14 }} />}
              label="Предзаказ"
              size="small"
              sx={{
                position: "absolute",
                top: 10,
                left: 10,
                bgcolor: alpha(theme.palette.preorder.main, 0.92),
                color: theme.palette.preorder.contrastText,
                fontWeight: 700,
                fontSize: isMobile ? "0.65rem" : "0.7rem",
                height: isMobile ? 22 : 24,
                borderRadius: 1.5,
                backdropFilter: "blur(4px)",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
              }}
            />
          )}
        </Box>

        {/* Контент карточки */}
        <CardContent
          sx={{
            p: { xs: 1.25, sm: 1.5 },
            "&:last-child": { pb: { xs: 1.5, sm: 1.75 } },
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Stack spacing={0.75}>
            {categories?.[0]?.name && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  fontSize: isMobile ? "0.625rem" : "0.7rem",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
              >
                {categories[0].name}
              </Typography>
            )}

            <Typography
              fontSize={isMobile ? "0.82rem" : "0.92rem"}
              fontWeight={600}
              color="text.primary"
              noWrap
              sx={{ lineHeight: 1.3 }}
            >
              {name}
            </Typography>
          </Stack>

          <Box sx={{ mt: 0.75 }}>
            <ProductPriceDisplay
              price={price}
              prepaymentAmount={prepaymentAmount}
              availability={availability}
              rating={sellerRating}
              reviewCount={totalReviews}
            />
          </Box>
        </CardContent>
      </Link>

      {/* Кнопка добавления в корзину */}
      {actions && (
        <Box
          sx={{
            px: { xs: 1.25, sm: 1.5 },
            pb: { xs: 1.5, sm: 1.75 },
          }}
          onClick={(e) => e.preventDefault()}
        >
          {actions}
        </Box>
      )}
    </Card>
  );
};

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
} from "@mui/material";
import { formatPrice } from "@/shared/lib/formatPrice";
import { ProductCardModel } from "../model/types";

interface ProductCardProps extends ProductCardModel {
  actions?: React.ReactNode;
  onCardClick?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  category,
  image,
  actions,
  availability,
  onCardClick,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Card
      sx={{
        maxWidth: "100%",
        width: "100%",
        borderRadius: { xs: 1.5, sm: 2 },
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: { xs: "none", sm: "translateY(-4px)" }, // Отключаем эффект поднятия на мобильных устройствах
          boxShadow: {
            xs: "0 2px 8px rgba(0, 0, 0, 0.06)",
            sm: "0 8px 16px rgba(0, 0, 0, 0.1)",
          },
        },
        bgcolor: "background.paper",
      }}
    >
      <Link
        href={`/catalog/${id}/detail`}
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
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          {image && image[0]?.imageData ? (
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
                src={`data:${image[0].contentType};base64,${image[0].imageData}`}
                fill
                sizes="(max-width: 600px) 50vw, 33vw" // Оптимизация загрузки для разных размеров экрана
                loading="lazy"
                style={{
                  objectFit: "cover",
                  opacity: isImageLoaded ? 1 : 0,
                  transition: "opacity 0.3s",
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
        </Box>

        {/* Контент карточки */}
        <CardContent
          sx={{
            p: { xs: "8px", sm: "12px" },
            "&:last-child": { pb: { xs: 1.5, sm: 2 } },
            flexGrow: 1,
            display: "flex",
            gap: 1,
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Stack spacing={isMobile ? 0.5 : 1}>
            {category?.name && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  fontSize: isMobile ? "0.625rem" : "0.75rem",
                  fontWeight: 500,
                }}
              >
                {category.name}
              </Typography>
            )}

            <Typography
              fontSize={isMobile ? "0.75rem" : "0.875rem"}
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minHeight: isMobile ? "32px" : "40px",
                lineHeight: 1.3,
                mb: isMobile ? 0.5 : 1,
              }}
            >
              {name}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                fontWeight={700}
                fontSize={isMobile ? "0.875rem" : "1rem"}
                color="text.primary"
              >
                {formatPrice(price) + " ₽"}
              </Typography>
            </Box>
          </Stack>

          {actions && <Box sx={{ mt: "auto", pt: 1 }}>{actions}</Box>}
        </CardContent>
      </Link>
    </Card>
  );
};

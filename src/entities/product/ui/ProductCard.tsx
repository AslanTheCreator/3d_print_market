"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Stack,
  Skeleton,
  useTheme,
  alpha,
  useMediaQuery,
} from "@mui/material";
import { ProductCardModel } from "../model/types";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import FavoriteBorderIcon from "@mui/icons-material/Favorite";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { formatPrice } from "@/shared/lib/formatPrice";

export const ProductCard: React.FC<ProductCardModel> = ({
  id,
  name,
  price,
  category,
  image,
}) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Active");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    // Здесь можно добавить логику сохранения состояния избранного
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Логика добавления в корзину
  };

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
        href={`/catalog/card/${id}`}
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
                color="primary.secondary"
              >
                {formatPrice(price)}
              </Typography>
            </Box>
          </Stack>

          {isMobile ? (
            <Box
              component="button"
              onClick={handleAddToCart}
              sx={{
                mt: "auto",
                pt: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                bgcolor: theme.palette.primary.main,
                color: "white",
                border: "none",
                borderRadius: 1,
                py: 0.75,
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
                transition: "background-color 0.2s",
                "&:hover": {
                  bgcolor: theme.palette.primary.dark,
                },
                "&:disabled": {
                  bgcolor: alpha(theme.palette.primary.main, 0.5),
                  cursor: "not-allowed",
                },
              }}
              disabled={status === "Cancelled"}
            >
              <ShoppingCartOutlinedIcon sx={{ fontSize: "0.875rem" }} />
              {status === "Active" ? "В корзину" : "Предзаказ"}
            </Box>
          ) : (
            <Stack direction="row" spacing={1} sx={{ mt: "auto", pt: 1 }}>
              <Box
                component="button"
                onClick={handleAddToCart}
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  bgcolor: theme.palette.primary.main,
                  color: "white",
                  border: "none",
                  borderRadius: 1.5,
                  py: 1,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                  "&:hover": {
                    bgcolor: theme.palette.primary.dark,
                  },
                  "&:disabled": {
                    bgcolor: alpha(theme.palette.primary.main, 0.5),
                    cursor: "not-allowed",
                  },
                }}
                disabled={status === "Cancelled"}
              >
                <ShoppingCartOutlinedIcon fontSize="small" />
                {status === "Active" ? "В корзину" : "Предзаказ"}
              </Box>
            </Stack>
          )}
        </CardContent>
      </Link>

      {/* Кнопка "Избранное" */}
      <IconButton
        sx={{
          position: "absolute",
          top: isMobile ? 4 : 10,
          right: isMobile ? 4 : 10,
          zIndex: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: "blur(4px)",
          width: isMobile ? 28 : 36,
          height: isMobile ? 28 : 36,
          padding: isMobile ? "4px" : "8px",
          "&:hover": {
            bgcolor: alpha(theme.palette.background.paper, 0.9),
          },
        }}
        onClick={handleFavoriteClick}
        aria-label={
          isFavorite ? "Удалить из избранного" : "Добавить в избранное"
        }
      >
        {isFavorite ? (
          <FavoriteIcon
            sx={{
              color: theme.palette.error.main,
              fontSize: isMobile ? "1rem" : "1.25rem",
            }}
          />
        ) : (
          <FavoriteBorderIcon
            sx={{
              color: theme.palette.text.secondary,
              fontSize: isMobile ? "1rem" : "1.25rem",
            }}
          />
        )}
      </IconButton>
    </Card>
  );
};

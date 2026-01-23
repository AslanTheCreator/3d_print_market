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
import { ProductCardModel } from "../model/types";
import { ProductPriceDisplay } from "./ProductPriceDisplay";

interface ProductCardProps extends ProductCardModel {
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
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const isPreorder = availability === "PREORDER";

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
          transform: { xs: "none", sm: "translateY(-4px)" },
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
                sizes="(max-width: 600px) 50vw, 33vw"
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

          {/* Бейдж предзаказа */}
          {isPreorder && (
            <Chip
              icon={<Schedule sx={{ fontSize: 14 }} />}
              label="Предзаказ"
              size="small"
              sx={{
                position: "absolute",
                top: 8,
                left: 8,
                bgcolor: alpha(theme.palette.preorder.main, 0.95),
                color: theme.palette.preorder.contrastText,
                fontWeight: 700,
                fontSize: isMobile ? "0.65rem" : "0.7rem",
                height: isMobile ? 22 : 24,
                backdropFilter: "blur(4px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            />
          )}
        </Box>

        {/* Контент карточки */}
        <CardContent
          sx={{
            p: { xs: "8px", sm: "12px" },
            "&:last-child": { pb: { xs: 1.5, sm: 2 } },
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Stack spacing={0.5}>
            {categories?.[0]?.name && (
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
                {categories[0].name}
              </Typography>
            )}

            <Typography
              fontSize={isMobile ? "0.8rem" : "0.9rem"}
              fontWeight={600}
              color="text.primary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.3,
              }}
            >
              {name}
            </Typography>
          </Stack>

          {/* Цена и рейтинг */}
          <Box sx={{ mt: 0.5 }}>
            <ProductPriceDisplay
              price={price}
              prepaymentAmount={prepaymentAmount}
              availability={availability}
            />
          </Box>
        </CardContent>
      </Link>

      {/* Кнопка добавления в корзину */}
      {actions && (
        <Box
          sx={{
            px: { xs: 1, sm: 1.5 },
            pb: { xs: 1.5, sm: 2 },
          }}
          onClick={(e) => e.preventDefault()}
        >
          {actions}
        </Box>
      )}
    </Card>
  );
};

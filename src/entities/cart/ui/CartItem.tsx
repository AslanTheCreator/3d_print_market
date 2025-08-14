"use client";

import {
  Box,
  IconButton,
  Stack,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  Paper,
  alpha,
  Skeleton,
} from "@mui/material";
import Image from "next/image";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useState } from "react";
import { CartProductModel } from "../model/types";
import { formatPrice } from "@/shared/lib";

interface CartItemProps extends CartProductModel {
  onRemove: (id: number) => void;
  isRemoving?: boolean;
}

export const CartItem = ({
  id,
  name,
  price,
  category,
  image,
  onRemove,
  isRemoving = false,
}: CartItemProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const handleRemove = () => onRemove(id);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2, md: 2.5 },
        mb: { xs: 2, md: 1.5 },
        borderRadius: { xs: 1.5, sm: 2 },
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        transition: "box-shadow 0.2s ease-in-out",
        "&:hover": {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        },
        opacity: isRemoving ? 0.6 : 1,
        pointerEvents: isRemoving ? "none" : "auto",
      }}
    >
      <Stack
        direction="row"
        spacing={{ xs: 2, md: 3 }}
        alignItems="center"
        sx={{ minHeight: { md: "100px" } }}
      >
        {/* Product Image */}
        <Box
          position="relative"
          sx={{
            width: { xs: 80, sm: 100, md: 90 },
            height: { xs: 80, sm: 100, md: 90 },
            borderRadius: 1.5,
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          {image?.[0]?.imageData ? (
            <>
              {!isImageLoaded && (
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height="100%"
                  animation="wave"
                  sx={{ position: "absolute" }}
                />
              )}
              <Image
                src={`data:${image[0].contentType};base64,${image[0].imageData}`}
                alt={name}
                fill
                sizes="(max-width: 600px) 80px, (max-width: 900px) 100px, 90px"
                style={{
                  objectFit: "cover",
                  opacity: isImageLoaded ? 1 : 0,
                  transition: "opacity 0.3s ease",
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
                textAlign: "center",
              }}
            >
              Изображение недоступно
            </Box>
          )}
        </Box>

        {/* Product Info */}
        <Stack
          flexGrow={1}
          spacing={{ xs: 0.5, md: 1 }}
          justifyContent="center"
          sx={{
            py: { md: 1 },
            minWidth: 0,
          }}
        >
          {category?.name && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.625rem", md: "0.75rem" },
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {category.name}
            </Typography>
          )}

          <Typography
            variant={isMobile ? "subtitle2" : isTablet ? "subtitle1" : "h6"}
            fontWeight={600}
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
            }}
          >
            {name}
          </Typography>

          <Typography
            variant={isMobile ? "body2" : "body1"}
            fontWeight={700}
            color="primary.main"
            sx={{ mt: { xs: 0.5, md: 0 } }}
          >
            {formatPrice(price)} ₽
          </Typography>
        </Stack>

        {/* Desktop Divider */}
        {!isMobile && !isTablet && (
          <Divider
            orientation="vertical"
            flexItem
            sx={{
              mx: 2,
              height: "60px",
              alignSelf: "center",
            }}
          />
        )}

        {/* Remove Button */}
        <Box sx={{ flexShrink: 0 }}>
          <IconButton
            onClick={handleRemove}
            disabled={isRemoving}
            aria-label="Удалить товар из корзины"
            sx={{
              p: { xs: 1, md: 1.5 },
              bgcolor: alpha(theme.palette.error.main, 0.1),
              borderRadius: "8px",
              color: theme.palette.error.main,
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.error.main, 0.15),
              },
              "&:disabled": {
                bgcolor: alpha(theme.palette.error.main, 0.05),
                color: alpha(theme.palette.error.main, 0.5),
              },
            }}
          >
            <DeleteOutlineIcon fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        </Box>
      </Stack>
    </Paper>
  );
};

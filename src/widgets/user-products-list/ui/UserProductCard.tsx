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
  Chip,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  MoreVert,
  Edit,
  Delete,
  Visibility,
  CalendarMonth,
  TrendingUp,
  Info,
} from "@mui/icons-material";
import { formatPrice } from "@/shared/lib/utils/formatPrice";
import { ProductCardModel } from "@/entities/product/model/types";
import { ExtendProductButton } from "@/features/product/extend-product/ui/ExtendProductButton";
import {
  getExpirationStatus,
  formatExpirationDate,
} from "@/entities/product/lib/productExpirationUtils";

interface UserProductCardProps extends ProductCardModel {
  onCardClick?: (id: string) => void;
}

export const UserProductCard: React.FC<UserProductCardProps> = ({
  id,
  name,
  price,
  categories,
  image,
  availability,
  count,
  expirationDate,
  onCardClick,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();

  const expirationStatus = getExpirationStatus(expirationDate);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getAvailabilityConfig = () => {
    switch (availability) {
      case "PURCHASABLE":
        return { color: "success" as const, label: "В наличии" };
      case "PREORDER":
        return { color: "warning" as const, label: "Предзаказ" };
      default:
        return { color: "info" as const, label: "Внешний" };
    }
  };

  const availabilityConfig = getAvailabilityConfig();

  return (
    <Card
      sx={{
        maxWidth: "100%",
        width: "100%",
        borderRadius: { xs: 1.5, sm: 2 },
        boxShadow: expirationStatus.isExpired
          ? `0 0 0 2px ${theme.palette.error.main}`
          : "0 2px 8px rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: { sm: "translateY(-4px)" },
          boxShadow: {
            sm: expirationStatus.isExpired
              ? `0 0 0 2px ${theme.palette.error.main}, 0 8px 16px rgba(0, 0, 0, 0.1)`
              : "0 8px 16px rgba(0, 0, 0, 0.1)",
          },
        },
        bgcolor: "background.paper",
        opacity: expirationStatus.isExpired ? 0.7 : 1,
      }}
    >
      <Link
        href={`/catalog/${id}/detail`}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
        }}
      >
        {/* Блок с изображением */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "1/1.2",
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

          {/* Badges сверху */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              position: "absolute",
              top: 8,
              left: 8,
              zIndex: 2,
            }}
          >
            <Chip
              label={availabilityConfig.label}
              color={availabilityConfig.color}
              size="small"
              sx={{
                fontSize: "0.625rem",
                height: "20px",
                fontWeight: 600,
              }}
            />
          </Stack>

          {/* Меню действий */}
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              "&:hover": {
                bgcolor: theme.palette.background.paper,
              },
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
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
                  fontSize: "0.625rem",
                  fontWeight: 500,
                }}
              >
                {categories[0].name}
              </Typography>
            )}

            <Typography
              fontSize="0.75rem"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minHeight: "32px",
                lineHeight: 1.3,
                mb: 0.5,
              }}
            >
              {name}
            </Typography>

            {/* Цена и количество */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                fontWeight={700}
                fontSize="0.875rem"
                color="text.primary"
              >
                {formatPrice(price)} ₽
              </Typography>
              {count > 0 && (
                <Chip
                  label={`${count} шт`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.625rem",
                    fontWeight: 600,
                  }}
                />
              )}
            </Stack>

            {/* Статус истечения */}
            <Tooltip
              title={`Истекает: ${formatExpirationDate(expirationDate)}`}
              arrow
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CalendarMonth sx={{ fontSize: 14, color: "text.secondary" }} />
                <Chip
                  label={expirationStatus.statusText}
                  size="small"
                  color={expirationStatus.statusColor}
                  icon={
                    expirationStatus.shouldShowWarning ? (
                      <Info sx={{ fontSize: 12 }} />
                    ) : undefined
                  }
                  sx={{
                    height: 20,
                    fontSize: "0.625rem",
                    fontWeight: 600,
                  }}
                />
              </Stack>
            </Tooltip>
          </Stack>

          {/* Кнопка продления */}
          {expirationStatus.shouldShowExtendButton && (
            <Box
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <ExtendProductButton
                productId={id}
                productName={name}
                currentExpirationDate={expirationDate}
                variant="icon"
                size="small"
              />
            </Box>
          )}
        </CardContent>
      </Link>

      {/* Меню */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            window.open(`/catalog/${id}/detail`, "_blank");
          }}
        >
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Посмотреть</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Редактировать</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <TrendingUp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Статистика</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Удалить</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

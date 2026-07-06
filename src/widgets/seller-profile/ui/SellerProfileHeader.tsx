"use client";

import type { ComponentType } from "react";
import {
  alpha,
  Avatar,
  Box,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import type { ChipProps, SvgIconProps } from "@mui/material";
import {
  AccessTime,
  Inventory2,
  LocationOn,
  Payments,
  Star,
  Storefront,
  WorkspacePremium,
} from "@mui/icons-material";
import { useImageMetadataQuery } from "@/shared/api";
import { getImageUrl } from "@/shared/lib";
import type { UserFindModel } from "@/entities/user";

const SELLER_PROFILE_TEMPORARY_DATA = {
  // Временные визуальные данные до расширения UserFindModel на backend.
  description:
    "Коллекционные фигурки, предзаказы и аксессуары для витрины. Продавец подбирает позиции для коллекционеров и аккуратно упаковывает отправления.",
  totalReviews: 126,
};

const SELLER_STATUS_META: Record<
  UserFindModel["sellerStatus"],
  { label: string; color: ChipProps["color"] }
> = {
  DEFAULT: {
    label: "Продавец",
    color: "default",
  },
  VIP: {
    label: "VIP",
    color: "secondary",
  },
  PRO: {
    label: "PRO",
    color: "primary",
  },
};

interface SellerProfileHeaderProps {
  seller: UserFindModel;
}

interface SellerStatProps {
  icon: ComponentType<SvgIconProps>;
  label: string;
  value: string;
  accent?: "primary" | "secondary" | "warning" | "success";
}

const getDayLabel = (value: number): string => {
  const absValue = Math.abs(value);
  const lastDigit = absValue % 10;
  const lastTwoDigits = absValue % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "дней";
  }

  if (lastDigit === 1) {
    return "день";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "дня";
  }

  return "дней";
};

const formatDeadline = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return "не указан";
  }

  return `${value} ${getDayLabel(value)}`;
};

const formatLocation = (seller: UserFindModel): string => {
  const parts = [seller.city, seller.country].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Локация не указана";
};

const formatRating = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return "нет оценок";
  }

  return value.toFixed(1);
};

const SellerStat = ({
  icon: Icon,
  label,
  value,
  accent = "primary",
}: SellerStatProps) => (
  <Box
    sx={{
      minWidth: 0,
      p: 1.5,
      minHeight: 76,
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 2,
      bgcolor: "background.paper",
    }}
  >
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 2,
          color: `${accent}.main`,
          bgcolor: (theme) => alpha(theme.palette[accent].main, 0.1),
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 19 }} />
      </Box>
      <Box minWidth={0}>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          color="text.primary"
          noWrap
        >
          {value}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            lineHeight: 1.25,
            fontWeight: 500,
            whiteSpace: "normal",
            overflowWrap: "anywhere",
          }}
        >
          {label}
        </Typography>
      </Box>
    </Stack>
  </Box>
);

export const SellerProfileHeader = ({ seller }: SellerProfileHeaderProps) => {
  const { data: images, isLoading: isImageLoading } = useImageMetadataQuery(
    seller.imageId,
  );
  const imageSrc = getImageUrl(images?.[0], "thumbnail");
  const displayName = seller.login || `Продавец #${seller.id}`;
  const statusMeta = SELLER_STATUS_META[seller.sellerStatus];
  const location = formatLocation(seller);
  const rating = formatRating(seller.averageRating);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: "0 6px 22px rgba(15, 23, 42, 0.05)",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2.5, md: 4 }}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1.75, sm: 2.5 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          flex={1}
          minWidth={0}
        >
          {isImageLoading ? (
            <Skeleton
              variant="circular"
              width={136}
              height={136}
              sx={{
                width: { xs: 104, sm: 136 },
                height: { xs: 104, sm: 136 },
                flexShrink: 0,
              }}
            />
          ) : (
            <Avatar
              src={imageSrc}
              alt={displayName}
              sx={{
                width: { xs: 104, sm: 136 },
                height: { xs: 104, sm: 136 },
                bgcolor: imageSrc ? "transparent" : "primary.main",
                color: "primary.contrastText",
                fontSize: { xs: 40, sm: 52 },
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {!imageSrc && displayName.charAt(0).toUpperCase()}
            </Avatar>
          )}

          <Box minWidth={0}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1 }}
            >
              <Typography
                component="h1"
                variant="h3"
                fontWeight={700}
                sx={{
                  fontSize: { xs: "1.55rem", sm: "2rem" },
                  lineHeight: 1.15,
                  wordBreak: "break-word",
                }}
              >
                {displayName}
              </Typography>
              <Chip
                icon={<WorkspacePremium sx={{ fontSize: 17 }} />}
                label={statusMeta.label}
                color={statusMeta.color}
                size="small"
                variant={seller.sellerStatus === "DEFAULT" ? "outlined" : "filled"}
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1.5 }}
            >
              <Chip
                icon={<LocationOn sx={{ fontSize: 16 }} />}
                label={location}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                maxWidth: 620,
                lineHeight: 1.65,
              }}
            >
              {SELLER_PROFILE_TEMPORARY_DATA.description}
            </Typography>
          </Box>
        </Stack>

        <Divider
          flexItem
          orientation="vertical"
          sx={{ display: { xs: "none", md: "block" } }}
        />

        <Box
          sx={{
            width: { xs: "100%", md: 360 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            gap: 1.25,
            flexShrink: 0,
          }}
        >
          <SellerStat
            icon={Star}
            label="рейтинг"
            value={rating}
            accent="warning"
          />
          <SellerStat
            icon={Storefront}
            label="отзывов"
            value={String(SELLER_PROFILE_TEMPORARY_DATA.totalReviews)}
            accent="secondary"
          />
          <SellerStat
            icon={Inventory2}
            label="заказов завершено"
            value={String(seller.orderCompletedCount)}
            accent="success"
          />
          <SellerStat
            icon={AccessTime}
            label="отправка"
            value={formatDeadline(seller.deadlineSending)}
            accent="primary"
          />
        </Box>
      </Stack>

      <Divider sx={{ my: 2.25 }} />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2 }}
        flexWrap="wrap"
        useFlexGap
      >
        <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
          <Payments sx={{ color: "text.secondary", fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            Срок оплаты:{" "}
            <Typography component="span" variant="body2" fontWeight={700}>
              {formatDeadline(seller.deadlinePayment)}
            </Typography>
          </Typography>
        </Stack>

        {seller.experience ? (
          <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
            <Storefront sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              Опыт:{" "}
              <Typography component="span" variant="body2" fontWeight={700}>
                {seller.experience}
              </Typography>
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
};

export const SellerProfileHeaderSkeleton = () => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      bgcolor: "background.paper",
    }}
  >
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={{ xs: 2.5, md: 4 }}
      alignItems={{ xs: "stretch", md: "center" }}
    >
      <Stack direction="row" spacing={2.5} alignItems="center" flex={1}>
        <Skeleton
          variant="circular"
          width={136}
          height={136}
          sx={{
            width: { xs: 104, sm: 136 },
            height: { xs: 104, sm: 136 },
            flexShrink: 0,
          }}
        />
        <Box flex={1}>
          <Skeleton variant="text" width="45%" height={42} />
          <Skeleton variant="text" width="70%" height={28} />
          <Skeleton variant="text" width="85%" height={24} />
        </Box>
      </Stack>
      <Box
        sx={{
          width: { xs: "100%", md: 360 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 1.25,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={76} />
        ))}
      </Box>
    </Stack>
  </Paper>
);

"use client";

import { Box, Chip, Paper, Stack, SxProps, Theme, Typography } from "@mui/material";
import { Star, TrendingUp } from "@mui/icons-material";
import Link from "next/link";
import { SellerAvatar } from "@/entities/user";

interface ProductSellerCardProps {
  participantId: number;
  sellerLogin: string;
  displayName: string;
  ratingLabel: string;
  reviewsLabel: string;
  hasRating: boolean;
  avatarSize: number;
  paperSx?: SxProps<Theme>;
  rootSpacing?: number;
}

export function ProductSellerCard({
  participantId,
  sellerLogin,
  displayName,
  ratingLabel,
  reviewsLabel,
  hasRating,
  avatarSize,
  paperSx,
  rootSpacing = 1.5,
}: ProductSellerCardProps) {
  return (
    <Link
      href={`/sellers/${participantId}`}
      prefetch={false}
      aria-label={`Перейти на страницу продавца ${displayName}`}
      style={{ color: "inherit", display: "block", textDecoration: "none" }}
    >
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
          cursor: "pointer",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            borderColor: "primary.light",
            boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
          },
          ...paperSx,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={rootSpacing}>
          <SellerAvatar
            participantId={participantId}
            sellerLogin={sellerLogin}
            size={avatarSize}
          />
          <Box flex={1} minWidth={0}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {displayName}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 0.75 }}
            >
              <Chip
                icon={<Star sx={{ fontSize: 14 }} />}
                label={ratingLabel}
                size="small"
                color="default"
                variant="outlined"
                sx={{
                  height: 24,
                  fontWeight: 700,
                  borderColor: hasRating ? "warning.light" : "divider",
                  color: hasRating ? "text.primary" : "text.secondary",
                  bgcolor: "background.paper",
                  "& .MuiChip-icon": {
                    color: hasRating ? "warning.main" : "text.secondary",
                  },
                }}
              />

              <Chip
                icon={<TrendingUp sx={{ fontSize: 14 }} />}
                label={reviewsLabel}
                size="small"
                variant="outlined"
                sx={{
                  height: 24,
                  fontWeight: 600,
                  borderColor: "divider",
                  color: "text.secondary",
                  bgcolor: "background.paper",
                }}
              />
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Link>
  );
}

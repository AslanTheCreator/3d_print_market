"use client";

import { Box, Chip, Paper, Stack, SxProps, Theme, Typography } from "@mui/material";
import { Star, TrendingUp } from "@mui/icons-material";
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
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
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
              color={hasRating ? "warning" : "default"}
              variant={hasRating ? "filled" : "outlined"}
              sx={{ height: 24, fontWeight: 700 }}
            />

            <Chip
              icon={<TrendingUp sx={{ fontSize: 14 }} />}
              label={reviewsLabel}
              size="small"
              variant="outlined"
              sx={{ height: 24, fontWeight: 600 }}
            />
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

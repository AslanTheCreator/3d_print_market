"use client";

import { Box, Typography, Paper, Stack } from "@mui/material";
import Link from "next/link";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import StarsIcon from "@/shared/assets/icons/StarsIcon";

interface ProductRatingProps {
  rating?: number;
  reviewsCount?: number;
  sellerUrl?: string;
  sellerName?: string;
}

export function ProductRating({
  rating,
  reviewsCount,
  sellerUrl = "",
  sellerName,
}: ProductRatingProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 2.5 },
        p: { xs: "12px 16px", sm: "16px 20px" },
        width: "fit-content",
      }}
    >
      <Link
        href={sellerUrl}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {rating && (
            <>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <StarsIcon />
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "16px", sm: "18px" },
                  }}
                >
                  {rating.toFixed(1)}
                </Typography>
              </Stack>

              {reviewsCount && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                >
                  ({reviewsCount} отзывов)
                </Typography>
              )}
            </>
          )}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
          >
            {sellerName || "Продавец"}
          </Typography>

          <KeyboardArrowRightIcon fontSize="medium" />
        </Stack>
      </Link>
    </Paper>
  );
}

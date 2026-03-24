"use client";

import { useMemo, useState } from "react";
import {
  alpha,
  Box,
  Button,
  Drawer,
  IconButton,
  Paper,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowForwardIos, Close } from "@mui/icons-material";
import { Review } from "@/shared/types";
import {
  formatAverageRating,
  formatReviewDate,
  formatReviewsLabel,
} from "./productDetailsFormatters";

interface MobileProductReviewsSectionProps {
  reviews: Review[];
}

interface MobileReviewCardProps {
  review: Review;
}

function MobileReviewCard({ review }: MobileReviewCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1.5}
        >
          <Box minWidth={0}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {review.reviewerName || "Покупатель"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatReviewDate(review.createdAt)}
            </Typography>
          </Box>

          <Rating
            value={review.rating}
            precision={1}
            readOnly
            size="small"
            sx={{ color: "warning.main", flexShrink: 0 }}
          />
        </Stack>

        <Typography
          variant="body2"
          sx={{
            lineHeight: 1.6,
            whiteSpace: "pre-line",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {review.comment.trim() || "Комментарий отсутствует"}
        </Typography>
      </Stack>
    </Paper>
  );
}

export function MobileProductReviewsSection({
  reviews,
}: MobileProductReviewsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerTitleId = "mobile-product-reviews-title";

  const { averageRating, reviewsCount } = useMemo(() => {
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        reviewsCount: 0,
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);

    return {
      averageRating: totalRating / reviews.length,
      reviewsCount: reviews.length,
    };
  }, [reviews]);

  const previewReview = reviews[0];

  if (reviewsCount === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mt: 2,
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
          Отзывы
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
          Отзывов пока нет
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Этот товар ещё не оценили покупатели.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mt: 2,
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Box minWidth={0}>
              <Typography variant="subtitle1" fontWeight={700}>
                Отзывы
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 0.5 }}
              >
                <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1 }}>
                  {formatAverageRating(averageRating)}
                </Typography>
                <Rating
                  value={averageRating}
                  precision={0.1}
                  readOnly
                  size="small"
                  sx={{ color: "warning.main" }}
                />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {formatReviewsLabel(reviewsCount)}
                </Typography>
              </Stack>
            </Box>

            <Button
              onClick={() => setIsOpen(true)}
              endIcon={<ArrowForwardIos sx={{ fontSize: 14 }} />}
              sx={{
                flexShrink: 0,
                minWidth: 0,
                px: 0,
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Все
            </Button>
          </Stack>

          {previewReview ? (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
              }}
            >
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Box minWidth={0}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {previewReview.reviewerName || "Покупатель"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatReviewDate(previewReview.createdAt)}
                    </Typography>
                  </Box>

                  <Rating
                    value={previewReview.rating}
                    precision={1}
                    readOnly
                    size="small"
                    sx={{ color: "warning.main", flexShrink: 0 }}
                  />
                </Stack>

                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: 1.6,
                    color: "text.primary",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 3,
                    overflow: "hidden",
                    whiteSpace: "pre-line",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {previewReview.comment.trim() || "Комментарий отсутствует"}
                </Typography>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Paper>

      <Drawer
        anchor="bottom"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        aria-labelledby={drawerTitleId}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          "& .MuiDrawer-paper": {
            borderRadius: "24px 24px 0 0",
            maxHeight: "78vh",
            px: 2,
            pt: 1,
            pb: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          },
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 5,
            borderRadius: 999,
            bgcolor: "divider",
            mx: "auto",
            mb: 1.5,
          }}
        />

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box minWidth={0}>
            <Typography id={drawerTitleId} variant="h6" fontWeight={800}>
              Отзывы
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 0.5 }}
            >
              <Typography variant="subtitle1" fontWeight={800}>
                {formatAverageRating(averageRating)}
              </Typography>
              <Rating
                value={averageRating}
                precision={0.1}
                readOnly
                size="small"
                sx={{ color: "warning.main" }}
              />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {formatReviewsLabel(reviewsCount)}
              </Typography>
            </Stack>
          </Box>

          <IconButton onClick={() => setIsOpen(false)} aria-label="Закрыть отзывы">
            <Close />
          </IconButton>
        </Stack>

        <Stack spacing={1.5} sx={{ overflowY: "auto", pb: 1 }}>
          {reviews.map((review) => (
            <MobileReviewCard key={review.id} review={review} />
          ))}
        </Stack>
      </Drawer>
    </>
  );
}

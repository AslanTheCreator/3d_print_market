"use client";

import { useMemo, useState } from "react";
import { ArrowBackIosNew, ArrowForwardIos, Close } from "@mui/icons-material";
import {
  alpha,
  Box,
  Button,
  Drawer,
  GlobalStyles,
  IconButton,
  Paper,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import type { Review } from "@/entities/review";
import {
  formatAverageRating,
  formatReviewDate,
  formatReviewsLabel,
} from "./productDetailsFormatters";

interface ProductReviewsSectionProps {
  reviews: Review[];
}

interface ReviewCardProps {
  review: Review;
  compact?: boolean;
}

const productReviewsSwiperStyles = {
  ".product-reviews-swiper.swiper": {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  ".product-reviews-swiper .swiper-wrapper": {
    position: "relative",
    zIndex: 1,
    display: "flex",
    width: "100%",
    height: "100%",
    boxSizing: "content-box",
    transitionProperty: "transform",
  },
  ".product-reviews-swiper .swiper-slide": {
    position: "relative",
    display: "block",
    flexShrink: 0,
    height: "auto",
    transitionProperty: "transform",
  },
};

function ReviewCard({ review, compact = false }: ReviewCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: compact ? 2 : 2.5,
        height: compact ? "auto" : 180,
        borderRadius: compact ? 2.5 : 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxSizing: "border-box",
        overflow: "hidden",
        boxShadow: compact
          ? "none"
          : "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <Stack spacing={compact ? 1.25 : 2}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={compact ? 1.5 : 2}
        >
          <Box minWidth={0}>
            <Typography
              variant={compact ? "subtitle2" : "subtitle1"}
              fontWeight={600}
              noWrap
            >
              {review.reviewerName || "Покупатель"}
            </Typography>
            <Typography
              variant={compact ? "caption" : "body2"}
              color="text.secondary"
            >
              {formatReviewDate(review.createdAt)}
            </Typography>
          </Box>

          <Rating
            value={review.rating}
            precision={1}
            readOnly
            size={compact ? "small" : "medium"}
            sx={{ color: "warning.main", flexShrink: 0 }}
          />
        </Stack>

        <Typography
          variant="body2"
          sx={{
            lineHeight: 1.6,
            color: "text.primary",
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

export function ProductReviewsSection({
  reviews,
}: ProductReviewsSectionProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(reviews.length <= 3);
  const drawerTitleId = "product-reviews-title";

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
  const showSliderControls = reviews.length > 3;

  if (reviewsCount === 0) {
    return null;
  }

  return (
    <>
      <GlobalStyles styles={productReviewsSwiperStyles} />

      <Box sx={{ display: { xs: "block", sm: "none" } }}>
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
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ lineHeight: 1 }}
                  >
                    {formatAverageRating(averageRating)}
                  </Typography>
                  <Rating
                    value={averageRating}
                    precision={0.1}
                    readOnly
                    size="small"
                    sx={{ color: "warning.main" }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    {formatReviewsLabel(reviewsCount)}
                  </Typography>
                </Stack>
              </Box>

              <Button
                onClick={() => setIsDrawerOpen(true)}
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
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
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
      </Box>

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={3}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Отзывы
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 1 }}
            >
              <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1 }}>
                {formatAverageRating(averageRating)}
              </Typography>
              <Rating
                value={averageRating}
                precision={0.1}
                readOnly
                sx={{ color: "warning.main" }}
              />
              <Typography variant="h6" color="text.secondary" fontWeight={600}>
                {formatReviewsLabel(reviewsCount)}
              </Typography>
            </Stack>
          </Box>

          {showSliderControls ? (
            <Stack direction="row" spacing={1}>
              <IconButton
                onClick={() => swiperInstance?.slidePrev()}
                disabled={isBeginning}
                aria-label="Предыдущий отзыв"
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
                }}
              >
                <ArrowBackIosNew sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                onClick={() => swiperInstance?.slideNext()}
                disabled={isEnd}
                aria-label="Следующий отзыв"
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
                }}
              >
                <ArrowForwardIos sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          ) : null}
        </Stack>

        <Box
          sx={{
            pb: 1,
            "& .swiper-slide": {
              width: "calc((100% - 32px) / 3) !important",
              height: "auto",
              boxSizing: "border-box",
            },
          }}
        >
          <Swiper
            className="product-reviews-swiper"
            slidesPerView="auto"
            slidesPerGroup={1}
            spaceBetween={16}
            onSwiper={(swiper) => {
              setSwiperInstance(swiper);
              setIsBeginning(swiper.isBeginning);
              setIsEnd(swiper.isEnd);
            }}
            onSlideChange={(swiper) => {
              setIsBeginning(swiper.isBeginning);
              setIsEnd(swiper.isEnd);
            }}
          >
            {reviews.map((review) => (
              <SwiperSlide key={review.id}>
                <ReviewCard review={review} />
              </SwiperSlide>
            ))}
          </Swiper>
        </Box>
      </Box>

      <Drawer
        data-testid="product-reviews-drawer"
        anchor="bottom"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        aria-labelledby={drawerTitleId}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            borderRadius: "24px 24px 0 0",
            maxHeight: "78vh",
            width: { xs: "100%", sm: "min(720px, calc(100% - 48px))" },
            mx: "auto",
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
            <Typography id={drawerTitleId} variant="h6" fontWeight={700}>
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
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                {formatReviewsLabel(reviewsCount)}
              </Typography>
            </Stack>
          </Box>

          <IconButton
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Закрыть отзывы"
          >
            <Close />
          </IconButton>
        </Stack>

        <Stack spacing={1.5} sx={{ overflowY: "auto", pb: 1 }}>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} compact />
          ))}
        </Stack>
      </Drawer>
    </>
  );
}

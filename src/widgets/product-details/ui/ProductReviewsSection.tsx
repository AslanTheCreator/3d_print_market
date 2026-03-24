"use client";

import { useMemo, useState } from "react";
import {
  alpha,
  Box,
  IconButton,
  Paper,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowBackIosNew, ArrowForwardIos } from "@mui/icons-material";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { Review } from "@/shared/types";
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
}

function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        height: 180,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxSizing: "border-box",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={2}
        >
          <Box minWidth={0}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {review.reviewerName || "Покупатель"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatReviewDate(review.createdAt)}
            </Typography>
          </Box>

          <Rating
            value={review.rating}
            precision={1}
            readOnly
            sx={{
              color: "warning.main",
              flexShrink: 0,
            }}
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
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(reviews.length <= 3);

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

  const showSliderControls = reviews.length > 3;

  if (reviewsCount === 0) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
          Отзывы
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            background: (theme) => alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Отзывов пока нет
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Этот товар ещё не оценили покупатели.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={3}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
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
  );
}

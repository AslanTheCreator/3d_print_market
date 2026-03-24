"use client";

import { useState, useCallback } from "react";
import { Box, Paper, IconButton, alpha, useTheme } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { MainImage } from "./MainImage";
import { ThumbnailList } from "./ThumbnailList";
import { FullscreenImageViewer } from "./FullscreenImageViewer";

interface ImageGalleryProps {
  images: string[];
  alt?: string;
}

export function ImageGallery({
  images,
  alt = "Изображение товара",
}: ImageGalleryProps) {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const handleImageSelect = (index: number) => {
    setCurrentIndex(index);
    swiperInstance?.slideTo(index);
  };

  const handleOpenFullscreen = useCallback(() => {
    setIsFullscreenOpen(true);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreenOpen(false);
  }, []);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;

      if (
        target.closest(".gallery-nav-button") ||
        target.closest(".swiper-pagination")
      ) {
        return;
      }

      handleOpenFullscreen();
    },
    [handleOpenFullscreen],
  );

  const handleImageKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleOpenFullscreen();
      }
    },
    [handleOpenFullscreen],
  );

  const handlePrev = useCallback(() => {
    swiperInstance?.slidePrev();
  }, [swiperInstance]);

  const handleNext = useCallback(() => {
    swiperInstance?.slideNext();
  }, [swiperInstance]);

  if (!images.length) return null;

  const showNavigation = images.length > 1;

  return (
    <>
      <Box
        component="section"
        role="button"
        tabIndex={0}
        aria-label="Галерея изображений товара"
        onKeyDown={handleImageKeyDown}
      >
        <Paper
          elevation={0}
          sx={{
            position: "relative",
            borderRadius: { xs: 2, sm: 2.5, md: 3 },
            overflow: "hidden",
            mb: { xs: 1.5, sm: 2, md: 2.5 },
            "& > div": {
              aspectRatio: {
                xs: "4/3",
                sm: "16/10",
                md: "3/2",
              },
            },
            cursor: "pointer",
            transition: "all 0.3s ease",
            "&:hover": {
              boxShadow: theme.shadows[4],
              "& .gallery-nav-button": {
                opacity: 1,
              },
            },
          }}
          onClick={handleImageClick}
        >
          {showNavigation ? (
            <>
              <IconButton
                className="gallery-nav-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                sx={{
                  position: "absolute",
                  left: { xs: 8, sm: 12, md: 16 },
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  width: { xs: 36, sm: 40, md: 44 },
                  height: { xs: 36, sm: 40, md: 44 },
                  bgcolor: alpha(theme.palette.common.white, 0.85),
                  backdropFilter: "blur(8px)",
                  color: theme.palette.text.primary,
                  opacity: 0,
                  transition: "all 0.3s ease",
                  boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.15)}`,
                  "&:hover": {
                    bgcolor: theme.palette.common.white,
                    transform: "translateY(-50%) scale(1.08)",
                    boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
                  },
                }}
                aria-label="Предыдущее изображение"
              >
                <ChevronLeft sx={{ fontSize: { xs: 22, sm: 24, md: 26 } }} />
              </IconButton>

              <IconButton
                className="gallery-nav-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                sx={{
                  position: "absolute",
                  right: { xs: 8, sm: 12, md: 16 },
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  width: { xs: 36, sm: 40, md: 44 },
                  height: { xs: 36, sm: 40, md: 44 },
                  bgcolor: alpha(theme.palette.common.white, 0.85),
                  backdropFilter: "blur(8px)",
                  color: theme.palette.text.primary,
                  opacity: 0,
                  transition: "all 0.3s ease",
                  boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.15)}`,
                  "&:hover": {
                    bgcolor: theme.palette.common.white,
                    transform: "translateY(-50%) scale(1.08)",
                    boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
                  },
                }}
                aria-label="Следующее изображение"
              >
                <ChevronRight sx={{ fontSize: { xs: 22, sm: 24, md: 26 } }} />
              </IconButton>
            </>
          ) : null}

          <Swiper
            modules={[Pagination]}
            onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
            onSwiper={setSwiperInstance}
            pagination={{ clickable: true }}
            spaceBetween={10}
            slidesPerView={1}
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            {images.map((src, index) => (
              <SwiperSlide key={index}>
                <MainImage
                  src={src}
                  alt={`${alt} ${index + 1}`}
                  priority={index === 0}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </Paper>

        {images.length > 1 ? (
          <ThumbnailList
            images={images}
            currentIndex={currentIndex}
            onImageSelect={handleImageSelect}
            alt={alt}
          />
        ) : null}
      </Box>

      <FullscreenImageViewer
        images={images}
        initialIndex={currentIndex}
        open={isFullscreenOpen}
        onClose={handleCloseFullscreen}
        alt={alt}
      />
    </>
  );
}

ImageGallery.displayName = "ImageGallery";

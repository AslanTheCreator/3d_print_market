"use client";

import { useState, useCallback } from "react";
import { Box, Paper, IconButton, alpha, useTheme } from "@mui/material";
import { Fullscreen } from "@mui/icons-material";
import { MainImage } from "./MainImage";
import { ThumbnailList } from "./ThumbnailList";
import { FullscreenImageViewer } from "./FullscreenImageViewer";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

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

  const handleImageClick = useCallback(() => {
    handleOpenFullscreen();
  }, [handleOpenFullscreen]);

  if (!images.length) return null;

  return (
    <>
      <Box
        component="section"
        role="img"
        aria-label="Галерея изображений товара"
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
              "& .fullscreen-button": {
                opacity: 1,
                transform: "translate(0, 0)",
              },
            },
          }}
          onClick={handleImageClick}
        >
          {/* Кнопка полноэкранного просмотра */}
          <IconButton
            className="fullscreen-button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenFullscreen();
            }}
            sx={{
              position: "absolute",
              top: { xs: 8, sm: 12, md: 16 },
              right: { xs: 8, sm: 12, md: 16 },
              zIndex: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: "blur(8px)",
              opacity: { xs: 1, sm: 0 },
              transform: { xs: "translate(0, 0)", sm: "translate(8px, -8px)" },
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: theme.palette.background.paper,
                transform: "translate(0, 0) scale(1.1)",
              },
            }}
            aria-label="Открыть полноэкранный просмотр"
          >
            <Fullscreen />
          </IconButton>

          <Swiper
            modules={[Navigation, Pagination]}
            onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
            onSwiper={setSwiperInstance}
            navigation
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

        {images.length > 1 && (
          <ThumbnailList
            images={images}
            currentIndex={currentIndex}
            onImageSelect={handleImageSelect}
            alt={alt}
          />
        )}
      </Box>

      {/* Полноэкранный просмотр */}
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

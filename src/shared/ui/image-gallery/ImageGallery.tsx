"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  GlobalStyles,
  Paper,
  IconButton,
  alpha,
  useTheme,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import type { Theme } from "@mui/material/styles";
import { MainImage } from "./MainImage";
import { ThumbnailList } from "./ThumbnailList";
import type { ImageGalleryImage } from "./types";

interface ImageGalleryProps {
  images: ImageGalleryImage[];
  alt?: string;
}

const LazyFullscreenImageViewer = dynamic(
  () =>
    import("./FullscreenImageViewer").then(
      (module) => module.FullscreenImageViewer,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

const imageGallerySwiperStyles = (theme: Theme) => ({
  ".product-image-swiper.swiper": {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },
  ".product-image-swiper .swiper-wrapper": {
    position: "relative",
    zIndex: 1,
    display: "flex",
    width: "100%",
    height: "100%",
    boxSizing: "content-box",
    transitionProperty: "transform",
  },
  ".product-image-swiper .swiper-slide": {
    position: "relative",
    display: "block",
    flexShrink: 0,
    width: "100%",
    height: "100%",
    transitionProperty: "transform",
  },
  ".product-image-swiper .swiper-pagination": {
    position: "absolute",
    zIndex: 10,
    left: 0,
    bottom: 8,
    width: "100%",
    textAlign: "center",
    transition: "opacity 0.3s",
    transform: "translate3d(0, 0, 0)",
  },
  ".product-image-swiper .swiper-pagination-bullet": {
    display: "inline-block",
    width: 8,
    height: 8,
    marginLeft: 4,
    marginRight: 4,
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    opacity: 1,
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)",
  },
  ".product-image-swiper .swiper-pagination-bullet-active": {
    backgroundColor: theme.palette.primary.main,
  },
});

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
      <GlobalStyles styles={imageGallerySwiperStyles} />

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
            className="product-image-swiper"
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
            {images.map((image, index) => (
              <SwiperSlide key={index}>
                <MainImage
                  src={image.previewSrc}
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

      {isFullscreenOpen ? (
        <LazyFullscreenImageViewer
          images={images}
          initialIndex={currentIndex}
          open={isFullscreenOpen}
          onClose={handleCloseFullscreen}
          alt={alt}
        />
      ) : null}
    </>
  );
}

ImageGallery.displayName = "ImageGallery";

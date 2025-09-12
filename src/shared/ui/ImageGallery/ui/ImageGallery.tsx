"use client";

import { useState, useCallback } from "react";
import { Box, Paper } from "@mui/material";
import { MainImage } from "./MainImage";
import { ThumbnailList } from "./ThumbnailList";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  const handleImageSelect = (index: number) => {
    setCurrentIndex(index);
    swiperInstance?.slideTo(index);
  };

  if (!images.length) return null;

  return (
    <Box component="section" role="img" aria-label="Галерея изображений товара">
      <Paper
        elevation={0}
        sx={{
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
        }}
      >
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
  );
}

ImageGallery.displayName = "ImageGallery";

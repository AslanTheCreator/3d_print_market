"use client";

import { useState, useCallback, memo } from "react";
import { Box, Paper, useTheme, useMediaQuery } from "@mui/material";
import { MainImage } from "./MainImage";
import { ThumbnailList } from "./ThumbnailList";

interface ImageGalleryProps {
  images: string[];
  alt?: string;
}

export const ImageGallery = memo<ImageGalleryProps>(
  ({ images, alt = "Изображение товара" }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleImageSelect = useCallback((index: number) => {
      setCurrentIndex(index);
    }, []);

    if (!images.length) return null;

    return (
      <Box
        component="section"
        role="img"
        aria-label="Галерея изображений товара"
      >
        {/* Главное изображение */}
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
          <MainImage
            src={images[currentIndex]}
            alt={`${alt} ${currentIndex + 1}`}
            priority={currentIndex === 0}
          />
        </Paper>

        {/* Миниатюры */}
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
);

ImageGallery.displayName = "ImageGallery";

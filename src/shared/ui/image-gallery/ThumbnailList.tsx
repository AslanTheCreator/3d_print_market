"use client";

import { Box, Paper, useTheme, useMediaQuery } from "@mui/material";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ImageFallback } from "@/shared/ui/image-fallback";
import type { ImageGalleryImage } from "./types";

interface ThumbnailListProps {
  images: ImageGalleryImage[];
  currentIndex: number;
  onImageSelect: (index: number) => void;
  alt: string;
}

export function ThumbnailList({
  images,
  currentIndex,
  onImageSelect,
  alt,
}: ThumbnailListProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const thumbnailSize = isMobile ? 60 : isTablet ? 80 : 100;

  const handleClick = useCallback(
    (index: number) => {
      onImageSelect(index);
    },
    [onImageSelect]
  );

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 2, sm: 2.5, md: 3 },
        p: { xs: 2, sm: 2.5, md: 3 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: { xs: 1, sm: 1.5, md: 2 },
          overflowX: "auto",
          pb: { xs: 1, sm: 1.5 },
          "&::-webkit-scrollbar": {
            height: { xs: 4, sm: 6, md: 8 },
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "rgba(0,0,0,0.05)",
            borderRadius: 1,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: 1,
            "&:hover": {
              backgroundColor: "rgba(0,0,0,0.3)",
            },
          },
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,0,0,0.2) rgba(0,0,0,0.05)",
        }}
      >
        {images.map((image, index) => (
          <ThumbnailItem
            key={index}
            src={image.thumbnailSrc ?? image.previewSrc}
            alt={`${alt} миниатюра ${index + 1}`}
            size={thumbnailSize}
            isActive={currentIndex === index}
            onClick={() => handleClick(index)}
          />
        ))}
      </Box>
    </Paper>
  );
}

interface ThumbnailItemProps {
  src: string;
  alt: string;
  size: number;
  isActive: boolean;
  onClick: () => void;
}

function ThumbnailItem({
  src,
  alt,
  size,
  isActive,
  onClick,
}: ThumbnailItemProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [src]);

  const imageSrc = hasImageError ? null : src;

  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        flexShrink: 0,
        width: size,
        height: size,
        position: "relative",
        cursor: "pointer",
        borderRadius: { xs: 1, sm: 1.25, md: 1.5 },
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        border: 2,
        borderColor: isActive ? "primary.main" : "transparent",
        bgcolor: "transparent",
        p: 0,
        "&:hover": {
          transform: isDesktop ? "scale(1.08) translateY(-2px)" : "scale(1.05)",
          boxShadow: isActive ? theme.shadows[8] : theme.shadows[4],
          borderColor: isActive ? "primary.dark" : "primary.light",
        },
        "&:active": {
          transform: "scale(0.95)",
        },
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
      aria-label={`Выбрать ${alt}`}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes={`${size}px`}
          style={{
            objectFit: "cover",
          }}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <ImageFallback compact label={alt} />
      )}
    </Box>
  );
}

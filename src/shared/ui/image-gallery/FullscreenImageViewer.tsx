"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
  Typography,
  Stack,
} from "@mui/material";
import {
  Close,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "@mui/icons-material";
import Image from "next/image";
import type { ImageGalleryImage } from "./types";

interface FullscreenImageViewerProps {
  images: ImageGalleryImage[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  alt?: string;
}

export function FullscreenImageViewer({
  images,
  initialIndex = 0,
  open,
  onClose,
  alt = "Изображение товара",
}: FullscreenImageViewerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Сброс зума при смене изображения
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Сброс индекса при открытии
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  // Навигация клавиатурой
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      }
    },
    [zoom, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (zoom > 1 && e.touches.length === 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    },
    [zoom, position]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging && zoom > 1 && e.touches.length === 1) {
        setPosition({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart, zoom]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          onClose();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handlePrevious, handleNext, handleZoomIn, handleZoomOut, onClose]);

  if (!images.length) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen
      sx={{
        "& .MuiDialog-paper": {
          bgcolor: "rgba(0, 0, 0, 0.95)",
          m: 0,
        },
      }}
      TransitionComponent={Fade}
      transitionDuration={300}
    >
      {/* Верхняя панель */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
          p: { xs: 1, sm: 2 },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="h6"
            sx={{
              color: "white",
              fontSize: { xs: "0.875rem", sm: "1rem" },
              fontWeight: 600,
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            {currentIndex + 1} / {images.length}
          </Typography>

          <Stack direction="row" spacing={1}>
            {!isMobile && (
              <>
                <IconButton
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  sx={{
                    color: "white",
                    bgcolor: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.2)",
                    },
                    "&:disabled": {
                      color: "rgba(255,255,255,0.3)",
                    },
                  }}
                >
                  <ZoomOut />
                </IconButton>
                <IconButton
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  sx={{
                    color: "white",
                    bgcolor: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.2)",
                    },
                    "&:disabled": {
                      color: "rgba(255,255,255,0.3)",
                    },
                  }}
                >
                  <ZoomIn />
                </IconButton>
              </>
            )}
            <IconButton
              onClick={onClose}
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.2)",
                },
              }}
            >
              <Close />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Контейнер изображения */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Zoom in={open} timeout={300}>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: { xs: "100%", sm: "90%", md: "80%" },
                height: { xs: "100%", sm: "90%", md: "80%" },
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${
                  position.y / zoom
                }px)`,
                transition: isDragging ? "none" : "transform 0.3s ease-out",
              }}
            >
              <Image
                src={
                  images[currentIndex].originalSrc ??
                  images[currentIndex].previewSrc
                }
                alt={`${alt} ${currentIndex + 1}`}
                fill
                sizes="100vw"
                style={{
                  objectFit: "contain",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                priority
                quality={100}
              />
            </Box>
          </Box>
        </Zoom>
      </Box>

      {/* Кнопки навигации */}
      {images.length > 1 && (
        <>
          <IconButton
            onClick={handlePrevious}
            sx={{
              position: "absolute",
              left: { xs: 8, sm: 16, md: 24 },
              top: "50%",
              transform: "translateY(-50%)",
              color: "white",
              bgcolor: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              width: { xs: 40, sm: 48, md: 56 },
              height: { xs: 40, sm: 48, md: 56 },
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.2)",
                transform: "translateY(-50%) scale(1.1)",
              },
              transition: "all 0.2s ease",
              zIndex: 2,
            }}
          >
            <ChevronLeft sx={{ fontSize: { xs: 28, sm: 32, md: 36 } }} />
          </IconButton>
          <IconButton
            onClick={handleNext}
            sx={{
              position: "absolute",
              right: { xs: 8, sm: 16, md: 24 },
              top: "50%",
              transform: "translateY(-50%)",
              color: "white",
              bgcolor: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              width: { xs: 40, sm: 48, md: 56 },
              height: { xs: 40, sm: 48, md: 56 },
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.2)",
                transform: "translateY(-50%) scale(1.1)",
              },
              transition: "all 0.2s ease",
              zIndex: 2,
            }}
          >
            <ChevronRight sx={{ fontSize: { xs: 28, sm: 32, md: 36 } }} />
          </IconButton>
        </>
      )}

      {/* Индикаторы внизу */}
      {images.length > 1 && (
        <Box
          sx={{
            position: "absolute",
            bottom: { xs: 16, sm: 24, md: 32 },
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
            display: "flex",
            gap: 1,
            p: 1.5,
            bgcolor: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: 3,
          }}
        >
          {images.map((_, index) => (
            <Box
              key={index}
              onClick={() => setCurrentIndex(index)}
              sx={{
                width: { xs: 8, sm: 10 },
                height: { xs: 8, sm: 10 },
                borderRadius: "50%",
                bgcolor:
                  currentIndex === index ? "white" : "rgba(255,255,255,0.3)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                "&:hover": {
                  bgcolor:
                    currentIndex === index ? "white" : "rgba(255,255,255,0.5)",
                  transform: "scale(1.2)",
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Подсказка по управлению */}
      {!isMobile && zoom === 1 && (
        <Fade in={open} timeout={1000}>
          <Box
            sx={{
              position: "absolute",
              bottom: { sm: 80, md: 100 },
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1,
              textAlign: "center",
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.875rem",
              animation: "fadeOut 3s ease-in-out forwards",
              "@keyframes fadeOut": {
                "0%": { opacity: 1 },
                "70%": { opacity: 1 },
                "100%": { opacity: 0 },
              },
            }}
          >
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              Используйте ← → для навигации
            </Typography>
            <Typography variant="caption" sx={{ display: "block" }}>
              + / - для зума • Перетаскивайте при зуме
            </Typography>
          </Box>
        </Fade>
      )}
    </Dialog>
  );
}

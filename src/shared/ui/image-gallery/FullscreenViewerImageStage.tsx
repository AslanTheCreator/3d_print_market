import type React from "react";
import { Box, Zoom } from "@mui/material";
import Image from "next/image";
import { ImageFallback } from "@/shared/ui/image-fallback";

interface FullscreenViewerImageStageProps {
  alt: string;
  currentImageSrc: string | null;
  currentIndex: number;
  isDragging: boolean;
  open: boolean;
  position: { x: number; y: number };
  shouldShowCurrentImage: boolean;
  zoom: number;
  onCurrentImageError: () => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchCancel: () => void;
  onTouchEnd: (event: React.TouchEvent) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onTouchStart: (event: React.TouchEvent) => void;
}

export const FullscreenViewerImageStage = ({
  alt,
  currentImageSrc,
  currentIndex,
  isDragging,
  open,
  position,
  shouldShowCurrentImage,
  zoom,
  onCurrentImageError,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchCancel,
  onTouchEnd,
  onTouchMove,
  onTouchStart,
}: FullscreenViewerImageStageProps): React.ReactElement => {
  return (
    <Box
      data-testid="fullscreen-image-stage"
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        touchAction: zoom > 1 ? "none" : "pan-y",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
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
            {shouldShowCurrentImage && currentImageSrc ? (
              <Image
                src={currentImageSrc}
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
                onError={onCurrentImageError}
              />
            ) : (
              <ImageFallback
                label="Изображение недоступно"
                sx={{
                  bgcolor: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.72)",
                }}
              />
            )}
          </Box>
        </Box>
      </Zoom>
    </Box>
  );
};

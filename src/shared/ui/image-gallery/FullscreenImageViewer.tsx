"use client";

import { Dialog, Fade } from "@mui/material";
import { FullscreenViewerHint } from "./FullscreenViewerHint";
import { FullscreenViewerImageStage } from "./FullscreenViewerImageStage";
import { FullscreenViewerIndicators } from "./FullscreenViewerIndicators";
import { FullscreenViewerNavigation } from "./FullscreenViewerNavigation";
import { FullscreenViewerTopBar } from "./FullscreenViewerTopBar";
import type { ImageGalleryImage } from "./types";
import { useFullscreenImageViewer } from "./useFullscreenImageViewer";

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
  const viewer = useFullscreenImageViewer({
    images,
    initialIndex,
    open,
    onClose,
  });

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
      <FullscreenViewerTopBar
        currentIndex={viewer.currentIndex}
        imageCount={images.length}
        zoom={viewer.zoom}
        onClose={onClose}
        onZoomIn={viewer.handleZoomIn}
        onZoomOut={viewer.handleZoomOut}
      />

      <FullscreenViewerImageStage
        alt={alt}
        currentImageSrc={viewer.currentImageSrc}
        currentIndex={viewer.currentIndex}
        isDragging={viewer.isDragging}
        open={open}
        position={viewer.position}
        shouldShowCurrentImage={viewer.shouldShowCurrentImage}
        zoom={viewer.zoom}
        onCurrentImageError={viewer.handleCurrentImageError}
        onMouseDown={viewer.handleMouseDown}
        onMouseMove={viewer.handleMouseMove}
        onMouseUp={viewer.handleMouseUp}
        onTouchEnd={viewer.handleTouchEnd}
        onTouchMove={viewer.handleTouchMove}
        onTouchStart={viewer.handleTouchStart}
      />

      <FullscreenViewerNavigation
        imageCount={images.length}
        onNext={viewer.handleNext}
        onPrevious={viewer.handlePrevious}
      />

      <FullscreenViewerIndicators
        currentIndex={viewer.currentIndex}
        imageCount={images.length}
        onSelect={viewer.setCurrentIndex}
      />

      <FullscreenViewerHint
        open={open}
        zoom={viewer.zoom}
      />
    </Dialog>
  );
}

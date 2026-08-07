"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageGalleryImage } from "./types";

const SWIPE_THRESHOLD_PX = 48;

interface UseFullscreenImageViewerOptions {
  images: ImageGalleryImage[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export const useFullscreenImageViewer = ({
  images,
  initialIndex,
  open,
  onClose,
}: UseFullscreenImageViewerOptions) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [failedImageSources, setFailedImageSources] = useState<Set<string>>(
    () => new Set(),
  );
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const currentImage = images[currentIndex];
  const currentImageSrc =
    currentImage?.originalSrc ?? currentImage?.previewSrc ?? null;
  const shouldShowCurrentImage =
    currentImageSrc !== null && !failedImageSources.has(currentImageSrc);

  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  useEffect(() => {
    setFailedImageSources(new Set());
  }, [images]);

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
    (event: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({
          x: event.clientX - position.x,
          y: event.clientY - position.y,
        });
      }
    },
    [position, zoom],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y,
        });
      }
    },
    [dragStart, isDragging, zoom],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length !== 1) {
        swipeStartRef.current = null;
        setIsDragging(false);
        return;
      }

      const touch = event.touches[0];

      if (zoom > 1) {
        swipeStartRef.current = null;
        setIsDragging(true);
        setDragStart({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        });
        return;
      }

      swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [position, zoom],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (isDragging && zoom > 1 && event.touches.length === 1) {
        setPosition({
          x: event.touches[0].clientX - dragStart.x,
          y: event.touches[0].clientY - dragStart.y,
        });
      }
    },
    [dragStart, isDragging, zoom],
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      setIsDragging(false);

      const swipeStart = swipeStartRef.current;
      swipeStartRef.current = null;

      if (zoom > 1 || !swipeStart || event.changedTouches.length !== 1) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - swipeStart.x;
      const deltaY = touch.clientY - swipeStart.y;

      if (
        Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) <= Math.abs(deltaY)
      ) {
        return;
      }

      if (deltaX < 0) {
        handleNext();
        return;
      }

      handlePrevious();
    },
    [handleNext, handlePrevious, zoom],
  );

  const handleTouchCancel = useCallback(() => {
    swipeStartRef.current = null;
    setIsDragging(false);
  }, []);

  const handleCurrentImageError = useCallback(() => {
    if (!currentImageSrc) {
      return;
    }

    setFailedImageSources((prev) => {
      const next = new Set(prev);
      next.add(currentImageSrc);
      return next;
    });
  }, [currentImageSrc]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
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

  return {
    currentIndex,
    currentImageSrc,
    handleCurrentImageError,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleNext,
    handlePrevious,
    handleTouchCancel,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    handleZoomIn,
    handleZoomOut,
    isDragging,
    position,
    setCurrentIndex,
    shouldShowCurrentImage,
    zoom,
  };
};

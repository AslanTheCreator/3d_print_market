import { useState, useCallback, useEffect, useRef } from "react";
import {
  revokeImagePreview,
  createImagePreview,
  validateImage,
} from "@/shared/lib";
import { ImageTag } from "@/shared/types";
import { imageApi } from "@/shared/api";

interface ImageUploadState {
  file: File | null;
  preview: string;
  id: number | null;
  isUploading: boolean;
  error: string | null;
}

export interface InitialImageUploadState {
  id: number;
  preview: string;
}

export interface UseMultipleImageUploadReturn {
  images: ImageUploadState[];
  imageIds: number[];
  isUploading: boolean;
  hasError: boolean;
  addImage: (file: File) => Promise<void>;
  removeImage: (index: number) => void;
  resetImages: (nextImages?: InitialImageUploadState[]) => void;
  setInitialImages: (nextImages: InitialImageUploadState[]) => void;
}

export const useMultipleImageUpload = (
  tag: ImageTag,
  maxImages: number = 3,
): UseMultipleImageUploadReturn => {
  const [images, setImages] = useState<ImageUploadState[]>([]);
  const imagesRef = useRef<ImageUploadState[]>([]);

  const revokePreviewIfNeeded = useCallback((url: string) => {
    if (url.startsWith("blob:")) {
      revokeImagePreview(url);
    }
  }, []);

  const mapInitialImages = useCallback(
    (nextImages: InitialImageUploadState[]): ImageUploadState[] =>
      nextImages.map((image) => ({
        file: null,
        preview: image.preview,
        id: image.id,
        isUploading: false,
        error: null,
      })),
    [],
  );

  // Очистка previews при размонтировании
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        if (img.preview) {
          revokePreviewIfNeeded(img.preview);
        }
      });
    };
  }, [revokePreviewIfNeeded]);

  const addImage = useCallback(
    async (file: File): Promise<void> => {
      if (images.length >= maxImages) {
        throw new Error(`Максимум ${maxImages} изображений`);
      }

      const validation = validateImage(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const preview = createImagePreview(file);
      const tempImage: ImageUploadState = {
        file,
        preview,
        id: null,
        isUploading: true,
        error: null,
      };

      setImages((prev) => [...prev, tempImage]);

      try {
        const response = await imageApi.saveImage(file, tag);
        const imageId = response[0];

        setImages((prev) =>
          prev.map((img) =>
            img.preview === preview
              ? { ...img, id: imageId, isUploading: false }
              : img,
          ),
        );
      } catch (error) {
        console.error("Ошибка загрузки изображения:", error);
        setImages((prev) =>
          prev.map((img) =>
            img.preview === preview
              ? {
                  ...img,
                  isUploading: false,
                  error: "Не удалось загрузить изображение",
                }
              : img,
          ),
        );
        throw error;
      }
    },
    [images.length, maxImages, tag],
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const imageToRemove = prev[index];
      if (imageToRemove?.preview) {
        revokePreviewIfNeeded(imageToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, [revokePreviewIfNeeded]);

  const resetImages = useCallback(
    (nextImages: InitialImageUploadState[] = []) => {
      setImages((prev) => {
        prev.forEach((img) => {
          if (img.preview) {
            revokePreviewIfNeeded(img.preview);
          }
        });

        return mapInitialImages(nextImages);
      });
    },
    [mapInitialImages, revokePreviewIfNeeded],
  );

  const setInitialImages = useCallback(
    (nextImages: InitialImageUploadState[]) => {
      resetImages(nextImages);
    },
    [resetImages],
  );

  const imageIds = images
    .filter((img) => img.id !== null)
    .map((img) => img.id as number);

  const isUploading = images.some((img) => img.isUploading);
  const hasError = images.some((img) => img.error !== null);

  return {
    images,
    imageIds,
    isUploading,
    hasError,
    addImage,
    removeImage,
    resetImages,
    setInitialImages,
  };
};

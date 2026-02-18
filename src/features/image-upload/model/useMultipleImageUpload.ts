import { useState, useCallback, useEffect } from "react";
import {
  revokeImagePreview,
  createImagePreview,
  validateImage,
} from "@/shared/lib";
import { ImageTag } from "@/shared/types";
import { imageApi } from "@/shared/api";

interface ImageUploadState {
  file: File;
  preview: string;
  id: number | null;
  isUploading: boolean;
  error: string | null;
}

export interface UseMultipleImageUploadReturn {
  images: ImageUploadState[];
  imageIds: number[];
  isUploading: boolean;
  hasError: boolean;
  addImage: (file: File) => Promise<void>;
  removeImage: (index: number) => void;
  resetImages: () => void;
}

export const useMultipleImageUpload = (
  tag: ImageTag,
  maxImages: number = 3,
): UseMultipleImageUploadReturn => {
  const [images, setImages] = useState<ImageUploadState[]>([]);

  // Очистка previews при размонтировании
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.preview) {
          revokeImagePreview(img.preview);
        }
      });
    };
  }, []);

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
        revokeImagePreview(imageToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const resetImages = useCallback(() => {
    images.forEach((img) => {
      if (img.preview) {
        revokeImagePreview(img.preview);
      }
    });
    setImages([]);
  }, [images]);

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
  };
};

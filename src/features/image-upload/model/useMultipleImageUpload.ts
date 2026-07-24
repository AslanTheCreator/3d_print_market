import { useState, useCallback, useEffect, useRef } from "react";
import {
  revokeImagePreview,
  createImagePreview,
  validateImage,
} from "@/shared/lib";
import { ImageTag } from "@/entities/image";
import { imageApi } from "@/entities/image";

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
  uploadError: string | null;
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
  const [uploadError, setUploadError] = useState<string | null>(null);
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
        // Загруженные фото могут быть восстановлены из черновика при переходе между страницами.
        if (img.preview && img.id === null) {
          revokePreviewIfNeeded(img.preview);
        }
      });
    };
  }, [revokePreviewIfNeeded]);

  const addImage = useCallback(
    async (file: File): Promise<void> => {
      if (imagesRef.current.length >= maxImages) {
        const errorMessage = `Максимум ${maxImages} изображений`;
        setUploadError(errorMessage);
        throw new Error(errorMessage);
      }

      const validation = validateImage(file);
      if (!validation.isValid) {
        const errorMessage = validation.error ?? "Invalid image";
        setUploadError(errorMessage);
        throw new Error(errorMessage);
      }

      setUploadError(null);

      const preview = createImagePreview(file);
      const tempImage: ImageUploadState = {
        file,
        preview,
        id: null,
        isUploading: true,
        error: null,
      };

      const nextImages = [...imagesRef.current, tempImage];
      imagesRef.current = nextImages;
      setImages(nextImages);

      try {
        const response = await imageApi.saveImage(file, tag);
        const imageId = response[0];

        setImages((prev) => {
          const next = prev.map((img) =>
            img.preview === preview
              ? { ...img, id: imageId, isUploading: false }
              : img,
          );
          imagesRef.current = next;
          return next;
        });
      } catch (error) {
        console.error("Ошибка загрузки изображения:", error);
        setUploadError("Не удалось загрузить изображение");
        setImages((prev) => {
          const next = prev.map((img) =>
            img.preview === preview
              ? {
                  ...img,
                  isUploading: false,
                  error: "Не удалось загрузить изображение",
                }
              : img,
          );
          imagesRef.current = next;
          return next;
        });
        throw error;
      }
    },
    [maxImages, tag],
  );

  const removeImage = useCallback((index: number) => {
    setUploadError(null);
    setImages((prev) => {
      const imageToRemove = prev[index];
      if (imageToRemove?.preview) {
        revokePreviewIfNeeded(imageToRemove.preview);
      }
      const next = prev.filter((_, i) => i !== index);
      imagesRef.current = next;
      return next;
    });
  }, [revokePreviewIfNeeded]);

  const resetImages = useCallback(
    (nextImages: InitialImageUploadState[] = []) => {
      setUploadError(null);
      setImages((prev) => {
        prev.forEach((img) => {
          if (img.preview) {
            revokePreviewIfNeeded(img.preview);
          }
        });

        const next = mapInitialImages(nextImages);
        imagesRef.current = next;
        return next;
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
    uploadError,
    addImage,
    removeImage,
    resetImages,
    setInitialImages,
  };
};

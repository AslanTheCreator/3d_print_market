import { useState, useCallback, useEffect } from "react";
import { imageApi } from "@/entities/image/api/imageApi";
import { validateImage } from "@/shared/lib/validation/image-validation";
import {
  createImagePreview,
  revokeImagePreview,
} from "@/shared/lib/utils/file-utils";
import { ImageTag } from "@/entities/image/model/types";

export interface UseImageUploadReturn {
  image: File | null;
  imagePreview: string | null;
  imageError: string | null;
  imageIds: number[];
  isUploading: boolean;
  handleImageChange: (file: File) => Promise<void>;
  resetImageState: () => void;
}

export const useImageUpload = (tag: ImageTag): UseImageUploadReturn => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageIds, setImageIds] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Очистка preview при размонтировании
  useEffect(() => {
    return () => {
      if (imagePreview) {
        revokeImagePreview(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = useCallback(
    async (file: File): Promise<void> => {
      const validation = validateImage(file);

      if (!validation.isValid) {
        setImageError(validation.error!);
        resetImageState();
        return;
      }

      setImageError(null);

      // Очищаем предыдущий preview
      if (imagePreview) {
        revokeImagePreview(imagePreview);
      }

      const preview = createImagePreview(file);
      setImage(file);
      setImagePreview(preview);

      // Загружаем на сервер
      try {
        setIsUploading(true);
        const response = await imageApi.saveImage(file, tag);
        setImageIds(response);
      } catch (error) {
        console.error("Ошибка при загрузке изображения:", error);
        setImageError("Не удалось загрузить изображение на сервер");
      } finally {
        setIsUploading(false);
      }
    },
    [tag, imagePreview]
  );

  const resetImageState = useCallback(() => {
    if (imagePreview) {
      revokeImagePreview(imagePreview);
    }
    setImage(null);
    setImagePreview(null);
    setImageIds([]);
    setImageError(null);
  }, [imagePreview]);

  return {
    image,
    imagePreview,
    imageError,
    imageIds,
    isUploading,
    handleImageChange,
    resetImageState,
  };
};

import { useState } from "react";
import { imageApi } from "@/entities/image/api/imageApi";
import { validateImage } from "@/shared/lib/validation/imageValidation";

export const useImageUpload = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageIds, setImageIds] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = async (file: File) => {
    const validation = validateImage(file);

    if (!validation.isValid) {
      setImageError(validation.error!);
      resetImageState();
      return;
    }

    setImageError(null);
    setImage(file);
    setImagePreview(URL.createObjectURL(file));

    try {
      setIsUploading(true);
      const response = await imageApi.saveImage(file, "PRODUCT");
      setImageIds(response);
    } catch (error) {
      console.error("Ошибка при загрузке изображения:", error);
      setImageError("Не удалось загрузить изображение на сервер");
    } finally {
      setIsUploading(false);
    }
  };

  const resetImageState = () => {
    setImage(null);
    setImagePreview(null);
    setImageIds([]);
    setImageError(null);
  };

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

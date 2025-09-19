export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const validateImage = (file: File): ImageValidationResult => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: "Размер файла не должен превышать 5 МБ",
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Поддерживаются только файлы: JPG, PNG, WebP`,
    };
  }

  if (!file.type.startsWith("image/")) {
    return {
      isValid: false,
      error: "Пожалуйста, загрузите изображение",
    };
  }

  return { isValid: true };
};

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateImage = (file: File): ImageValidationResult => {
  if (file.size > 5 * 1024 * 1024) {
    return {
      isValid: false,
      error: "Размер файла не должен превышать 5 МБ",
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

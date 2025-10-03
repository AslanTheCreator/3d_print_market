export const createImagePreview = (file: File): string => {
  return URL.createObjectURL(file);
};

export const revokeImagePreview = (url: string): void => {
  URL.revokeObjectURL(url);
};

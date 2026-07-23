export const getSafeExternalUrl = (
  value: string | null | undefined,
): string | null => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) return null;

  try {
    const url = new URL(trimmedValue);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

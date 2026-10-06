export const parseNonNegativeSafeInteger = (value: unknown): number | null => {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const parsePositiveSafeInteger = (value: unknown): number | null => {
  const parsed = parseNonNegativeSafeInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

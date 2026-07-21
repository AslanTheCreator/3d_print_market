import type { ListOrdersModel } from "@/entities/order";

type OrderHistory = ListOrdersModel["histories"][number];

export const getSafeTrackingUrl = (value: string): string | null => {
  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  try {
    const url = new URL(trimmedValue);

    return url.protocol === "http:" || url.protocol === "https:"
      ? trimmedValue
      : null;
  } catch {
    return null;
  }
};

export const sortOrderHistories = (
  histories: readonly OrderHistory[],
): OrderHistory[] =>
  histories
    .map((history, index) => ({
      history,
      index,
      timestamp: Date.parse(history.changedAt),
    }))
    .sort((first, second) => {
      const firstIsValid = Number.isFinite(first.timestamp);
      const secondIsValid = Number.isFinite(second.timestamp);

      if (firstIsValid !== secondIsValid) return firstIsValid ? -1 : 1;
      if (!firstIsValid) return first.index - second.index;

      return first.timestamp - second.timestamp || first.index - second.index;
    })
    .map(({ history }) => history);

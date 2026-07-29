import type { ListOrdersModel } from "@/entities/order";
import { parseOrderDateTimestamp } from "./orderDate";

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
      timestamp: parseOrderDateTimestamp(history.changedAt),
    }))
    .sort((first, second) => {
      const firstIsValid = first.timestamp !== null;
      const secondIsValid = second.timestamp !== null;

      if (firstIsValid !== secondIsValid) return firstIsValid ? -1 : 1;
      if (!firstIsValid) return first.index - second.index;

      return (
        (first.timestamp as number) - (second.timestamp as number) ||
        first.index - second.index
      );
    })
    .map(({ history }) => history);

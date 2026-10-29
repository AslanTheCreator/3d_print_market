import { publicClient } from "@/shared/api";
import { ApiError } from "@/shared/lib/errorHandler";
import { parsePositiveSafeInteger } from "@/shared/lib";
import type { GiveawayResponse } from "../model/giveaway";

async function read(path: string, signal?: AbortSignal, productId?: number): Promise<GiveawayResponse | null> {
  let data: GiveawayResponse;
  try {
    ({ data } = await publicClient.get<GiveawayResponse>(path, { signal }));
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
  if (!data || typeof data !== "object" || Array.isArray(data) ||
    (data.productId != null && (typeof data.productId !== "number" || parsePositiveSafeInteger(data.productId) === null || (productId !== undefined && data.productId !== productId))) ||
    [data.name, data.description, data.telegramUrl, data.rules, data.homeText, data.startAt, data.endAt, data.status].some(value => value != null && typeof value !== "string") ||
    (data.imageIds != null && (!Array.isArray(data.imageIds) || !data.imageIds.every(id => typeof id === "number" && parsePositiveSafeInteger(id) !== null))) ||
    (data.winnersCount != null && !Number.isSafeInteger(data.winnersCount))) {
    throw new Error("Некорректные данные розыгрыша");
  }
  return data;
}

export const giveawayApi = {
  active: (signal?: AbortSignal) => read("/giveaways/active", signal),
  detail: (productId: number, signal?: AbortSignal) => {
    if (!Number.isSafeInteger(productId) || productId <= 0) throw new Error("Некорректный ID розыгрыша");
    return read(`/giveaways/products/${productId}`, signal, productId);
  },
};

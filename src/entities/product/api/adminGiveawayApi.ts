import { authClient } from "@/shared/api";
import { parsePositiveSafeInteger } from "@/shared/lib";
import type { AdminGiveawayProductRequest, AdminGiveawayProductResponse, GiveawaySettingsRequest } from "../model/giveaway";
import type { AdminGiveawayProduct } from "../model/giveawaySettings";

const checkId = (id: number) => { if (parsePositiveSafeInteger(id) === null) throw new Error("Некорректный ID розыгрыша"); };
function checkProduct(product: AdminGiveawayProduct | null | undefined, id?: number): asserts product is AdminGiveawayProduct {
  if (!product || typeof product !== "object" || Array.isArray(product) || typeof product.id !== "number" ||
    parsePositiveSafeInteger(product.id) === null || (id !== undefined && product.id !== id) || product.availability !== "GIVEAWAY" ||
    (product.giveawayEnabled != null && typeof product.giveawayEnabled !== "boolean") ||
    [product.name, product.description, product.status, product.giveawayTelegramUrl, product.giveawayStartAt, product.giveawayEndAt, product.giveawayRules, product.giveawayHomeText].some(value => value != null && typeof value !== "string") ||
    (product.participantId != null && (typeof product.participantId !== "number" || parsePositiveSafeInteger(product.participantId) === null)) ||
    (product.giveawayWinnersCount != null && !Number.isSafeInteger(product.giveawayWinnersCount))) throw new Error("Некорректные данные розыгрыша");
}
export const adminGiveawayApi = {
  async create(input: AdminGiveawayProductRequest): Promise<void> {
    await authClient.post("/products", input);
  },
  async history(page: number, signal?: AbortSignal): Promise<AdminGiveawayProduct[]> {
    if (!Number.isSafeInteger(page) || page < 0) throw new Error("Некорректная страница");
    const { data } = await authClient.get<AdminGiveawayProduct[]>("/admin/actions/giveaways/history", { params: { page, size: 50 }, signal });
    if (!Array.isArray(data)) throw new Error("Некорректная история розыгрышей");
    data.forEach(product => checkProduct(product)); return data;
  },
  async detail(id: number, signal?: AbortSignal): Promise<AdminGiveawayProductResponse> {
    checkId(id);
    const { data } = await authClient.get<AdminGiveawayProductResponse>(`/admin/actions/giveaways/${id}`, { signal });
    checkProduct(data?.product, id); return data;
  },
  async update(id: number, settings: GiveawaySettingsRequest) {
    checkId(id); await authClient.put(`/admin/actions/giveaways/${id}`, settings);
  },
};

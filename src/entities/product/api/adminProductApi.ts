import { authClient, publicClient } from "@/shared/api";
import { giveawayProductRelations, toAdminProductRequest, type AdminProductDto, type AdminProductInput, type AdminProductRelations } from "../model/admin";
import { adminGiveawayApi } from "./adminGiveawayApi";

export const adminProductApi = {
  async list(agentId: number, signal?: AbortSignal) {
    return (await authClient.get<AdminProductDto[]>(`/admin/actions/agents/${agentId}/products`, { signal })).data;
  },
  async get(id: number, signal?: AbortSignal) {
    return (await authClient.get<AdminProductDto>(`/admin/actions/products/${id}`, { signal })).data;
  },
  async relations(id: number, signal?: AbortSignal, giveaway = false): Promise<AdminProductRelations> {
    if (giveaway) return giveawayProductRelations(await adminGiveawayApi.detail(id, signal));
    return (await publicClient.get<AdminProductRelations>(`/product/${id}`, { signal })).data;
  },
  async update(agentId: number, id: number, input: AdminProductInput) {
    if (!Number.isFinite(input.price) || input.availability === "EXTERNAL_PRODUCT" && (!Number.isFinite(input.prepaymentAmount) ||
        (input.count !== null && (!Number.isSafeInteger(input.count) || input.count < 0)))) {
      throw new Error("Некорректные числовые значения товара");
    }
    await authClient.put(`/admin/actions/agents/${agentId}/products/${id}`, toAdminProductRequest(input));
  },
  async status(id: number, productStatus: "ACTIVE" | "BLOCKED") {
    await authClient.put(`/admin/actions/product/${id}`, undefined, { params: { productStatus } });
  },
  async extend(agentId: number, id: number) {
    await authClient.post(`/admin/actions/agents/${agentId}/products/${id}/extend`);
  },
};

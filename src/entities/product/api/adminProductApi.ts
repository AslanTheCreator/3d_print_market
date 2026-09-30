import { authClient, publicClient } from "@/shared/api";
import type { AdminProductDto, AdminProductInput } from "../model/admin";
import type { ProductDetailDto } from "../model/types";

export const adminProductApi = {
  async list(agentId: number, signal?: AbortSignal) {
    return (await authClient.get<AdminProductDto[]>(`/admin/actions/agents/${agentId}/products`, { signal })).data;
  },
  async get(id: number, signal?: AbortSignal) {
    return (await authClient.get<AdminProductDto>(`/admin/actions/products/${id}`, { signal })).data;
  },
  async relations(id: number, signal?: AbortSignal) {
    return (await publicClient.get<ProductDetailDto>(`/product/${id}`, { signal })).data;
  },
  async update(agentId: number, id: number, input: AdminProductInput) {
    await authClient.put(`/admin/actions/agents/${agentId}/products/${id}`, input);
  },
  async status(id: number, productStatus: "ACTIVE" | "BLOCKED") {
    await authClient.put(`/admin/actions/product/${id}`, undefined, { params: { productStatus } });
  },
  async extend(agentId: number, id: number) {
    await authClient.post(`/admin/actions/agents/${agentId}/products/${id}/extend`);
  },
};

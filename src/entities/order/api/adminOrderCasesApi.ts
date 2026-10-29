import { authClient } from "@/shared/api";
import type { OrderCaseDetail, OrderCaseState, OrderCaseSummary, ResolveOrderCaseRequest } from "../model/orderCase";
import { getSafeCaseTelegramUrl } from "../lib/getSafeCaseTelegramUrl";

const root = "/admin/actions/order-cases";
const validateId = (id: number) => { if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Некорректный ID обращения"); };
export const adminOrderCasesApi = {
  async list(state: OrderCaseState, page: number, signal?: AbortSignal): Promise<OrderCaseSummary[]> {
    if (!["OPEN", "RESOLVED"].includes(state) || !Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(page * 50)) throw new Error("Некорректная страница обращений");
    const { data } = await authClient.get<OrderCaseSummary[]>(root, { params: { state, limit: 50, offset: page * 50 }, signal });
    if (!Array.isArray(data) || data.some(item => !item || typeof item !== "object")) throw new Error("Некорректный ответ очереди обращений");
    return data;
  },
  async detail(caseId: number, signal?: AbortSignal): Promise<OrderCaseDetail> {
    validateId(caseId);
    const { data } = await authClient.get<OrderCaseDetail>(`${root}/${caseId}`, { signal });
    if (!data || data.orderCase?.id !== caseId) throw new Error("Ответ относится к другому обращению или не содержит его ID");
    return data;
  },
  async telegram(caseId: number, value: string): Promise<void> {
    validateId(caseId);
    const url = getSafeCaseTelegramUrl(value.trim());
    if (!url) throw new Error("Укажите HTTPS-ссылку t.me или telegram.me");
    await authClient.put(`${root}/${caseId}/telegram-url?${new URLSearchParams({ url })}`);
  },
  async resolve(caseId: number, request: ResolveOrderCaseRequest): Promise<void> {
    validateId(caseId);
    if (!["BUYER", "SELLER", "CANCELLED", "REJECTED"].includes(request.outcome) || !request.comment.trim()) throw new Error("Укажите допустимое решение и непустой комментарий");
    // Success body не нужен: состояние и результат подтверждаются чтением деталей.
    await authClient.post(`${root}/${caseId}/resolve?${new URLSearchParams({ outcome: request.outcome, comment: request.comment.trim() })}`);
  },
};

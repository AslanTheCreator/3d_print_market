import { authClient } from "@/shared/api";
import { decodeOrderTermsEvents } from "../lib/orderTermsHistory";
import type { DeliveryHistoryContext, DeliveryTermsContext, DeliveryTermsRequest } from "../model/orderTerms";
import { orderPath } from "./orderPath";
import { orderTextResponse } from "./orderTextResponse";

export const orderTermsApi = {
  async history(context: DeliveryHistoryContext, orderId: number, signal: AbortSignal) {
    const { data } = await authClient.get<unknown>(orderPath(context, orderId) + "/terms-history", { ...orderTextResponse, signal });
    return decodeOrderTermsEvents(data);
  },
  async update(context: DeliveryTermsContext, orderId: number, body: DeliveryTermsRequest, signal: AbortSignal) {
    const url = orderPath(context, orderId);
    const { data, status } = await authClient.put<unknown>(url + "/delivery", body, { signal, replayAfterRefresh: false });
    if (status !== 200 || data !== orderId) throw new Error("Сервер не подтвердил номер заказа");
  },
};

import type { OrderCase, OrderCaseDetail } from "@/entities/order";

// Общая fixture новых контрактов; consumers задают только различия сценария.
export function orderCaseDetailFixture(detail: Omit<OrderCaseDetail, "orderCase">, orderCase: OrderCase): OrderCaseDetail {
  return { ...detail, orderCase };
}

export function backendContractRejection(method: string, url: URL, authorization?: string, orderImageIds: number[] = []) {
  if (method === "POST" && (/^\/order\/\d+\/FAILED$/.test(url.pathname) || /^\/order\/orders\/\d+\/dispute\/COMPLETED$/.test(url.pathname)))
    return { status: 404, body: { code: "NOT_FOUND" } };
  if (method === "DELETE" && url.pathname === "/images" && url.searchParams.get("tag") === "ORDER")
    return { status: 400, body: { code: "BAD_REQUEST" } };
  if (method === "GET" && url.pathname === "/images" && !authorization && url.searchParams.getAll("ids").some(id => orderImageIds.includes(Number(id))))
    return { status: 200, body: [] };
  return null;
}

import type { ListOrdersModel } from "../model/types";
import type { OrderCaseDetail } from "../model/orderCase";

export const uniqueOrderImageIds = (ids: readonly unknown[]) =>
  [...new Set(ids.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0))];

// ImageResponse не содержит ID: известный чек читается отдельным запросом одного ID.
export function getOrderCaseImageGroups(order: Pick<ListOrdersModel, "images" | "paymentProofImageId">, cases: readonly OrderCaseDetail[]) {
  const proofIds = uniqueOrderImageIds([order.paymentProofImageId, ...cases.map(detail => detail.paymentProofImageId)]);
  return {
    proofIds,
    orderImageIds: uniqueOrderImageIds([...(order.images ?? []), ...cases.flatMap(detail => detail.orderImages ?? [])]).filter(id => !proofIds.includes(id)),
    cases: cases.map(detail => ({
      imageIds: uniqueOrderImageIds(detail.caseImages ?? []).filter(id => !proofIds.includes(id)),
      proofIds: uniqueOrderImageIds([detail.paymentProofImageId, ...(detail.caseImages ?? []).filter(id => proofIds.includes(id))]),
    })),
  };
}

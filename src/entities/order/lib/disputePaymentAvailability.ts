import type { ListOrdersDto } from "../model/types";
import type { OrderCaseDetail } from "../model/orderCase";
import type { OrderCaseAccess } from "./orderCaseAvailability";

export function getDisputePaymentCase(
  order: Pick<ListOrdersDto, "orderId" | "actualStatus" | "product">,
  cases: readonly OrderCaseDetail[],
  access: OrderCaseAccess,
): OrderCaseDetail | null {
  if (access.role !== "customer" || !access.userId || !access.inOwnList ||
    order.product.sellerId === access.userId || order.actualStatus !== "DISPUTED") return null;
  if (cases.some(detail => !detail.orderCase || !["OPEN", "RESOLVED"].includes(detail.orderCase.state ?? "") ||
    (detail.orderCase.orderId != null && detail.orderCase.orderId !== order.orderId) ||
    (detail.buyerId != null && detail.buyerId !== access.userId) ||
    (detail.sellerId != null && detail.sellerId !== order.product.sellerId) ||
    (detail.orderStatus != null && detail.orderStatus !== order.actualStatus))) return null;
  const open = cases.filter(detail => detail.orderCase?.state === "OPEN");
  const target = open[0];
  const id = target?.orderCase?.id;
  return open.length === 1 && typeof id === "number" && Number.isSafeInteger(id) && id > 0 &&
    target.orderCase?.kind === "DISPUTE" && target.orderCase.previousOrderStatus === "AWAITING_PAYMENT"
    ? target : null;
}

export function hasDisputePaymentProof(cases: readonly OrderCaseDetail[], caseId: number, imageId: number) {
  // orderImages пополняются уже при upload и не доказывают принятие POST.
  return cases.some(detail => detail.orderCase?.id === caseId && detail.orderCase.kind === "DISPUTE" &&
    detail.orderCase.previousOrderStatus === "AWAITING_PAYMENT" &&
    (detail.paymentProofImageId === imageId || detail.caseImages?.includes(imageId)));
}

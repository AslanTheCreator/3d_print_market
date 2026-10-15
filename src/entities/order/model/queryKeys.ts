export const orderQueryKeys = {
  all: ["orders"] as const,
  caseHistories: () => [...orderQueryKeys.all, "cases"] as const,
  cases: (orderId: number | null) => [...orderQueryKeys.caseHistories(), orderId] as const,
  orderData: (productId: number) =>
    [...orderQueryKeys.all, "data", productId] as const,
  sellerOrders: () => [...orderQueryKeys.all, "seller"] as const,
  customerOrders: () => [...orderQueryKeys.all, "customer"] as const,
};

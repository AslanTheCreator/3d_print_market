export const orderQueryKeys = {
  all: ["orders"] as const,
  termsHistory: (orderId: number) => ["orders", "terms-history", orderId] as const,
  caseHistories: () => [...orderQueryKeys.all, "cases"] as const,
  cases: (orderId: number | null) => [...orderQueryKeys.caseHistories(), orderId] as const,
  orderData: (productId: number) =>
    [...orderQueryKeys.all, "data", productId] as const,
  sellerOrders: () => [...orderQueryKeys.all, "seller"] as const,
  sellerConfirmation: (kind: "order" | "preorder") => ["sellerConfirmation", kind] as const,
  customerOrders: () => [...orderQueryKeys.all, "customer"] as const,
};

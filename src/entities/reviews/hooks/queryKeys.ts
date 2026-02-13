export const reviewsQueryKeys = {
  all: ["reviews"] as const,
  seller: (sellerId: number) =>
    [...reviewsQueryKeys.all, "seller", sellerId] as const,
};

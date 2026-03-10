export const transferKeys = {
  all: ["transfers"] as const,
  list: () => [...transferKeys.all, "list"] as const,
  detail: (id: number) => [...transferKeys.all, "detail", id] as const,
} as const;

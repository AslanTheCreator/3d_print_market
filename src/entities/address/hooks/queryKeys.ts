export const addressKeys = {
  all: ["addresses"] as const,
  list: () => [...addressKeys.all, "list"] as const,
  details: () => [...addressKeys.all, "detail"] as const,
  detail: (id: number) => [...addressKeys.details(), id] as const,
};

export const productKeys = {
  all: ["products"] as const, // General key for product lists
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: string | Record<string, any>) =>
    [...productKeys.lists(), { filters }] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string | number) => [...productKeys.details(), id] as const, // Matches ["product", id] usage
};

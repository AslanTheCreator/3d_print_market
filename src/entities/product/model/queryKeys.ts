export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    filters ? ([...productKeys.lists(), { filters }] as const) : productKeys.lists(),
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string | number) => [...productKeys.details(), id] as const,
  userAll: () => [...productKeys.all, "user"] as const,
  userLists: () => [...productKeys.userAll(), "list"] as const,
  userList: (filters?: Record<string, unknown>) =>
    filters
      ? ([...productKeys.userLists(), { filters }] as const)
      : productKeys.userLists(),
  renewalCheck: () => [...productKeys.userAll(), "renewal-check"] as const,
} as const;
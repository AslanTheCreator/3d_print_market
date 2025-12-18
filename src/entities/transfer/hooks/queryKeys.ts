export const transferKeys = {
  all: ["transfers"] as const,

  lists: () => [...transferKeys.all, "list"] as const,
  list: (filters?: Record<string, any>) =>
    filters
      ? ([...transferKeys.lists(), filters] as const)
      : transferKeys.lists(),
  user: () => [...transferKeys.all, "me"] as const,
  userList: () => [...transferKeys.user(), "list"] as const,
} as const;

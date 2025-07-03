export const transferKeys = {
  all: ["transfers"] as const,
  lists: () => [...transferKeys.all, "list"] as const,
  userTransfers: () => [...transferKeys.lists(), "user"] as const,
};

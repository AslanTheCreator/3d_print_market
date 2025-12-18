export const userKeys = {
  all: ["user"] as const,
  current: () => [...userKeys.all, "current"] as const,
  profile: () => [...userKeys.all, "profile"] as const,
  byId: (id: number) => [...userKeys.all, "by-id", id] as const,
};

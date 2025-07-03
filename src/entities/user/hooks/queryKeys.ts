export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: string | Record<string, any>) =>
    [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string | number | undefined) => [...userKeys.details(), id] as const, // For user by id/params
  profile: () => [...userKeys.all, "profile"] as const, // For user profile
};

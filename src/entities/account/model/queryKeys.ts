export const accountsKeys = {
  all: ["accounts"] as const,

  lists: () => [...accountsKeys.all, "list"] as const,
  list: (filters?: Record<string, any>) =>
    filters
      ? ([...accountsKeys.lists(), filters] as const)
      : accountsKeys.lists(),

  user: () => [...accountsKeys.all, "me"] as const,
  userList: () => [...accountsKeys.user(), "list"] as const,

  byTransferMethod: (method: string) =>
    [...accountsKeys.all, "transfer", method] as const,

  // Ключи для счетов участника (продавца)
  participant: (participantId: number) =>
    [...accountsKeys.all, "participant", participantId] as const,
} as const;

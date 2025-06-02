export const accountsKeys = {
  all: ["accounts"] as const,
  user: () => [...accountsKeys.all, "user"] as const,
  byTransferMethod: (method: string) =>
    [...accountsKeys.all, "transfer", method] as const,
};

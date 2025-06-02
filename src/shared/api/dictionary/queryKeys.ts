export const dictionaryKeys = {
  all: ["dictionary"] as const,
  type: (type: string) => [...dictionaryKeys.all, type] as const,
};

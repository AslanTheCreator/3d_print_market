export const cartKeys = {
  all: ["cart"] as const, // Matches the existing key from queries.tsx
  list: () => [...cartKeys.all, "list"] as const, // Standard list key
  // Add other keys if needed, e.g., for details if a cart had a detail view
};

export const socialNetworksKeys = {
  all: ["social-networks"] as const,
  lists: () => [...socialNetworksKeys.all, "list"] as const,
  details: () => [...socialNetworksKeys.all, "detail"] as const,
  detail: (id: number) => [...socialNetworksKeys.details(), id] as const,
};

export const socialNetworksKeys = {
  all: ["social-networks"] as const,
  lists: () => [...socialNetworksKeys.all, "list"] as const,
};

import { SocialNetworkType } from "../model/types";

export const socialNetworksKeys = {
  all: ["social-networks"] as const,
  userList: () => [...socialNetworksKeys.all, "user"] as const,
  byType: (type: SocialNetworkType) =>
    [...socialNetworksKeys.userList(), type] as const,
};

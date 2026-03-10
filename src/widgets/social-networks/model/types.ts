import type { SocialNetworkType } from "@/shared/types";

export interface SocialNetworkInput {
  type: SocialNetworkType;
  login: string;
}

export type SocialNetworkType = "VK" | "FACEBOOK" | "TELEGRAM" | "WHATSAPP";

export interface SocialNetworksModel {
  id: number;
  type: SocialNetworkType;
  login: string;
  participantId: number;
}

export interface SocialNetworksCreateModel {
  type: SocialNetworkType;
  login: string;
}

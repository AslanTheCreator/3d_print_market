export type SocialNetworkType = "VK" | "FACEBOOK" | "TELEGRAM" | "WHATSAPP";

export interface SocialNetworks {
  id: number;
  type: SocialNetworkType;
  login: string;
  participantId: number;
}

export interface SocialNetworksInput {
  type: SocialNetworkType;
  login: string;
}

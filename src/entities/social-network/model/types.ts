export type SocialNetworkType = "VK" | "FACEBOOK" | "TELEGRAM" | "WHATSAPP";

export interface SocialNetwork {
  id: number;
  type: SocialNetworkType;
  login: string;
  participantId: number;
}

export interface SocialNetworkInput {
  type: SocialNetworkType;
  login: string;
}

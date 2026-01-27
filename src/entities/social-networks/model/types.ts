export type SocialNetworkType = "VK" | "FACEBOOK" | "TELEGRAM" | "WHATSAPP";

// Базовая модель — то, что приходит с сервера
export interface SocialNetwork {
  id: number;
  type: SocialNetworkType;
  login: string;
  participantId: number;
}

// Модель для создания/обновления — отправляем на сервер
export interface SocialNetworkInput {
  type: SocialNetworkType;
  login: string;
}

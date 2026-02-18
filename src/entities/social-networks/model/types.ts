import { SocialNetworkType } from "@/shared/types";

// Модель для создания/обновления — отправляем на сервер
export interface SocialNetworkInput {
  type: SocialNetworkType;
  login: string;
}

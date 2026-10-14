import type { Currency } from "@/shared/types";
import type { AdminProductDto } from "./admin";
import type { ProductCreateModel, ProductDto } from "./types";

// Отсутствие required в OpenAPI не подтверждает бизнес-валидность пустого запроса.
export interface GiveawaySettingsRequest {
  enabled?: boolean;
  telegramUrl?: string;
  startAt?: string;
  endAt?: string;
  winnersCount?: number;
  rules?: string;
  homeText?: string;
}

export interface GiveawayResponse {
  productId?: number | null;
  name?: string | null;
  description?: string | null;
  imageIds?: number[] | null;
  telegramUrl?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  winnersCount?: number | null;
  rules?: string | null;
  homeText?: string | null;
  status?: ProductDto["status"] | null;
}

export interface AdminGiveawayProductResponse {
  product?: ({
    [Field in keyof Omit<AdminProductDto, "currency">]?: AdminProductDto[Field] | null;
  } & { currency?: Currency | "CREATE" | null }) | null;
  imageIds?: number[] | null;
  categories?: { id?: number | null; name?: string | null }[] | null;
}

// Отдельный административный вариант CreateOrUpdateProductRequest.
// Остальные поля не становятся обязательными до ответа на B3.
export interface AdminGiveawayProductRequest extends Omit<
  Partial<ProductCreateModel>, "availability" | "currency"
> {
  availability: "GIVEAWAY";
  currency?: Currency | "CREATE";
  used?: boolean;
  giveaway?: GiveawaySettingsRequest;
}

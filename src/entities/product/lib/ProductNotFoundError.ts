import { ApiError } from "@/shared/lib/errorHandler";

// Только 404 основного GET товара; ошибки metadata не являются отсутствием товара.
export class ProductNotFoundError extends ApiError {
  constructor() {
    super("Товар не найден", undefined, 404);
    this.name = "ProductNotFoundError";
    Object.setPrototypeOf(this, ProductNotFoundError.prototype);
  }
}

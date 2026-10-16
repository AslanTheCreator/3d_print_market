import { formatPrice } from "@/shared/lib";
import type { OrderCaseDetail } from "@/entities/order";

export function formatCaseAmount(value: number | null | undefined, currency: OrderCaseDetail["currency"]) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Не указана";
  if (!currency) return `${value} (валюта не указана)`;
  if (currency === "CREATE") return `${value} (техническая валюта CREATE)`;
  return formatPrice(value, currency);
}

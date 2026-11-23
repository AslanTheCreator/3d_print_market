import { normalizeDeliveryAmount } from "../model/orderTerms";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function snapshot(value: unknown) {
  const data = record(value);
  return {
    carrier: typeof data.carrier === "string" ? data.carrier : undefined,
    address: typeof data.address === "string" ? data.address : undefined,
    amount: data.deliveryAmount === null ? null : typeof data.deliveryAmount === "string"
      ? normalizeDeliveryAmount(data.deliveryAmount) : undefined,
  };
}

export function decodeTermsHistory(raw: unknown) {
  if (!Array.isArray(raw)) throw new Error("Некорректный ответ истории условий");
  return raw.flatMap(item => {
    const event = record(item);
    if (event.kind !== "DELIVERY_CHANGED") return [];
    let payload: Record<string, unknown> = {};
    if (typeof event.payload === "string") {
      try {
        payload = record(JSON.parse(event.payload, (key, value: unknown, context?: { source?: string }) =>
          key === "deliveryAmount" && typeof value === "number" ? context?.source : value));
      } catch { /* Сохраняем метаданные повреждённого события. */ }
    }
    const after = record(payload.after);
    const previous = snapshot(payload.before);
    const next = snapshot(after);
    return [{
      id: Number.isSafeInteger(event.id) ? event.id as number : undefined,
      actor: Number.isSafeInteger(event.actor_id) ? event.actor_id as number : undefined,
      date: typeof event.created_at === "string" ? event.created_at : undefined,
      before: previous, after: next,
      incomplete: previous.amount === undefined || next.amount === undefined,
      reason: typeof after.reason === "string" ? after.reason : undefined,
    }];
  });
}

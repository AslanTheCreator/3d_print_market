import { hasTermsVersion, normalizeDeliveryAmount } from "../model/orderTerms";

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

// Дробь или экспонента могут дать безопасное целое после JSON.parse. Проверяем и исходную запись.
function exactInteger(value: unknown, source: string | undefined, minimum: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && source === String(value)
    ? value : undefined;
}

function readPayload(raw: unknown) {
  if (typeof raw === "string") {
    try {
      return record(JSON.parse(raw, (key, value: unknown, context?: { source?: string }) => {
        if (key === "imageId") return exactInteger(value, context?.source, 1);
        if (key === "expectedVersion") return exactInteger(value, context?.source, 0);
        return (key === "deliveryAmount" || key === "confirmedPaidAmount") && typeof value === "number" ? context?.source : value;
      }));
    } catch { /* Сохраняем метаданные повреждённого события. */ }
  }
  return {};
}

function decodeEvent(item: unknown) {
  const event = record(item);
  const { kind } = event;
  if (kind !== "DELIVERY_CHANGED" && kind !== "PAYMENT_SUBMITTED" && kind !== "PAYMENT_APPROVED" && kind !== "PAYMENT_RETURNED") return;
  const metadata = {
    id: Number.isSafeInteger(event.id) ? event.id as number : undefined,
    actor: Number.isSafeInteger(event.actor_id) ? event.actor_id as number : undefined,
    date: typeof event.created_at === "string" ? event.created_at : undefined,
  };
  const payload = readPayload(event.payload);
  if (kind === "DELIVERY_CHANGED") {
    const after = record(payload.after);
    const previous = snapshot(payload.before);
    const next = snapshot(after);
    return {
      ...metadata, kind,
      before: previous, after: next,
      expectedVersion: hasTermsVersion(after.expectedVersion) ? after.expectedVersion : undefined,
      incomplete: previous.amount === undefined || next.amount === undefined,
      reason: typeof after.reason === "string" ? after.reason : undefined,
    } as const;
  }
  const request = kind === "PAYMENT_SUBMITTED" ? payload : record(payload.request);
  const expectedVersion = hasTermsVersion(request.expectedVersion) ? request.expectedVersion : undefined;
  const imageId = typeof payload.imageId === "number" && Number.isSafeInteger(payload.imageId) && payload.imageId > 0
    ? payload.imageId : undefined;
  const base = { ...metadata, expectedVersion, imageId };
  const incomplete = metadata.id === undefined || imageId === undefined || expectedVersion === undefined;
  if (kind === "PAYMENT_SUBMITTED") return { ...base, kind, incomplete } as const;
  const paid = payload.confirmedPaidAmount;
  const confirmedPaidAmount = paid === null || (typeof paid === "string" && /^\d+(?:\.\d+)?$/.test(paid)) ? paid : undefined;
  const review = { ...base, confirmedPaidAmount, incomplete: incomplete || confirmedPaidAmount === undefined };
  if (kind === "PAYMENT_APPROVED") return { ...review, kind } as const;
  const reason = typeof request.reason === "string" && request.reason.trim() ? request.reason : undefined;
  return { ...review, kind, reason, incomplete: review.incomplete || reason === undefined } as const;
}

export type OrderTermsEvent = NonNullable<ReturnType<typeof decodeEvent>>;

export function decodeOrderTermsEvents(raw: unknown): OrderTermsEvent[] {
  if (typeof raw !== "string") throw new Error("Некорректный ответ истории условий");
  const events: unknown = JSON.parse(raw, (key, value: unknown, context?: { source?: string }) =>
    key === "id" || key === "actor_id" ? exactInteger(value, context?.source, 1) : value);
  if (!Array.isArray(events)) throw new Error("Некорректный ответ истории условий");
  return events.map(decodeEvent).filter(event => event !== undefined);
}

export function deliveryEvents(events: OrderTermsEvent[]) {
  return events.filter(event => event.kind === "DELIVERY_CHANGED");
}

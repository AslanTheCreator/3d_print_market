export function formatDateTime(value: string): string {
  if (/^\d{2}\.\d{2}\.\d{4}/.test(value)) return value;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(timestamp);
}

import type { GiveawayResponse } from "../model/giveaway";

export type GiveawayPhase = "scheduled" | "active" | "ended" | "unavailable";
export interface GiveawayTiming {
  phase: GiveawayPhase;
  remainingMs: number | null;
}

export function parseGiveawayDate(value?: string | null): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const second = Number(match[6] ?? 0);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getGiveawayWindow(data?: GiveawayResponse | null) {
  const start = parseGiveawayDate(data?.startAt), end = parseGiveawayDate(data?.endAt);
  return start !== null && end !== null && start < end ? { start, end } : null;
}

export function getGiveawayTiming(data: GiveawayResponse | null | undefined, now: number): GiveawayTiming {
  const window = getGiveawayWindow(data);
  if (!window || !Number.isFinite(now)) return { phase: "unavailable", remainingMs: null };
  if (now >= window.end) return { phase: "ended", remainingMs: 0 };
  if (data?.status !== "ACTIVE" && data?.status !== "AWAITING_GIVEAWAY") return { phase: "unavailable", remainingMs: null };
  return now < window.start
    ? { phase: "scheduled", remainingMs: window.start - now }
    : { phase: "active", remainingMs: window.end - now };
}

export function formatGiveawayCountdown(remainingMs: number) {
  let seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  if (!Number.isFinite(seconds)) return "—";
  const days = Math.floor(seconds / 86400); seconds %= 86400;
  const hours = Math.floor(seconds / 3600); seconds %= 3600;
  const minutes = Math.floor(seconds / 60); seconds %= 60;
  const time = [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
  return days ? `${days} д. ${time}` : time;
}

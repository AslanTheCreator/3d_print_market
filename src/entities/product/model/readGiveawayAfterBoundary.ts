import { getGiveawayWindow } from "../lib/giveawayTiming";
import type { GiveawayResponse } from "./giveaway";

const crossed = (data: GiveawayResponse | null | undefined, from: number, to: number) => {
  const window = getGiveawayWindow(data);
  return window !== null && [window.start, window.end].some(time => from < time && time <= to);
};

// Первый GET тоже может пересечь границу до того, как UI узнает даты.
// Не публикуем его snapshot: читаем заново после границы, используя тот же signal.
export async function readGiveawayAfterBoundary(
  read: () => Promise<GiveawayResponse | null>, signal: AbortSignal,
  known?: GiveawayResponse | null, now: () => number = Date.now,
): Promise<GiveawayResponse | null> {
  // Два дополнительных чтения покрывают start/end; меняющиеся серверные окна
  // не должны превращать одну попытку в неограниченный polling.
  for (let attempt = 0; attempt <= 2; attempt++) {
    signal.throwIfAborted();
    const startedAt = now();
    let data: GiveawayResponse | null;
    try { data = await read(); }
    catch (error) {
      signal.throwIfAborted();
      if (attempt < 2 && crossed(known, startedAt, now())) continue;
      throw error;
    }
    signal.throwIfAborted();
    if (!crossed(known, startedAt, now()) && !crossed(data, startedAt, now())) return data;
    known = data ?? known;
  }
  throw new Error("Не удалось получить данные после временной границы розыгрыша. Повторите загрузку.");
}

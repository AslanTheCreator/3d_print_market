import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parsePositiveSafeInteger } from "@/shared/lib";
import { giveawayApi } from "../api/giveawayApi";
import { getGiveawayTiming, getGiveawayWindow } from "../lib/giveawayTiming";
import { readGiveawayAfterBoundary } from "./readGiveawayAfterBoundary";
import type { GiveawayResponse } from "./giveaway";

export const giveawayKeys = {
  all: ["giveaways"] as const,
  active: () => ["giveaways", "active"] as const,
  details: () => ["giveaways", "detail"] as const,
  detail: (id: number) => ["giveaways", "detail", id] as const,
};

export function usePublicGiveaway(productId?: number) {
  const client = useQueryClient();
  const valid = productId === undefined || parsePositiveSafeInteger(productId) !== null;
  const queryKey = productId === undefined ? giveawayKeys.active() : giveawayKeys.detail(productId);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => readGiveawayAfterBoundary(
      () => productId === undefined ? giveawayApi.active(signal) : giveawayApi.detail(productId, signal),
      signal, client.getQueryData<GiveawayResponse | null>(queryKey),
    ),
    enabled: valid,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
  const [, setNow] = useState(Date.now);
  const [completion, setCompletion] = useState<{ id: number | undefined; ended: boolean }>();
  const { refetch } = query;
  const timeWindow = getGiveawayWindow(query.data);
  const start = timeWindow?.start, end = timeWindow?.end;

  useEffect(() => {
    if (!valid) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previous = Date.now();
    if (end !== undefined) setCompletion({ id: productId, ended: previous >= end });
    const refresh = () => { void refetch({ cancelRefetch: true }); };
    const tick = () => {
      clearTimeout(timer);
      const now = Date.now();
      setNow(now);
      if (end !== undefined && now >= end) setCompletion({ id: productId, ended: true });
      // Только пересечение границы вызывает GET; секундные тики обновляют лишь UI.
      const crossed = [start, end].some(boundary => boundary !== undefined && previous < boundary && boundary <= now);
      if (crossed) refresh();
      previous = now;
      const next = [start, end].find(boundary => boundary !== undefined && boundary > now);
      if (next !== undefined) timer = setTimeout(tick, Math.min(1000, next - now));
      return crossed;
    };
    const resume = () => {
      if (document.visibilityState === "hidden") return;
      if (!tick()) refresh();
    };
    tick();
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [start, end, productId, refetch, valid]);

  const timing = getGiveawayTiming(query.data, Date.now());
  const ended = timing.phase === "ended" || (!query.data && completion?.id === productId && completion?.ended === true);
  return { ...query, timing, ended };
}

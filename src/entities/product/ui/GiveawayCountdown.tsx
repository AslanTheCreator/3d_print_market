import { Typography } from "@mui/material";
import { formatGiveawayCountdown, type GiveawayTiming } from "../lib/giveawayTiming";

export function GiveawayCountdown({ timing }: { timing: GiveawayTiming }) {
  if (timing.phase === "ended") return <Typography>Розыгрыш завершён</Typography>;
  if (timing.remainingMs === null) return <Typography color="text.secondary">Даты розыгрыша недоступны</Typography>;
  const label = timing.phase === "scheduled" ? "До начала" : "До завершения";
  return <Typography role="timer" aria-label={label} sx={{ overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>
    {label}: {formatGiveawayCountdown(timing.remainingMs)}
  </Typography>;
}

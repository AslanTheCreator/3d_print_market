import type { ReactNode } from "react";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { formatDateTime } from "@/shared/lib";
import type { OrderCaseDetail } from "../model/orderCase";

const kinds: Record<string, string> = { CANCELLATION_REQUEST: "Запрос отмены", DISPUTE: "Спор", PAYMENT_APPEAL: "Обращение об оплате после отмены" };
const outcomes: Record<string, string> = { BUYER: "В пользу покупателя", SELLER: "В пользу продавца", CANCELLED: "Заказ отменён", REJECTED: "Запрос отклонён", LEGACY: "Решение по историческому спору" };
const date = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? formatDateTime(value) : "Не указана";
export const getSafeCaseTelegramUrl = (value?: string | null) => {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && ["t.me", "telegram.me"].includes(url.hostname) && !url.username && !url.password && !url.port && url.pathname.length > 1 ? url.href : null;
  } catch { return null; }
};

export function OrderCaseCard({ detail, participants = [], children }: {
  detail: OrderCaseDetail; participants?: readonly { id: number; login: string }[]; children?: ReactNode;
}) {
  const item = detail.orderCase;
  const author = participants.find(participant => participant.id === item?.openedBy);
  const telegram = getSafeCaseTelegramUrl(item?.telegramUrl);
  return <Paper component="article" variant="outlined" sx={{ p: 2, borderRadius: 2, overflowWrap: "anywhere" }} data-testid="order-case-card">
    <Stack spacing={1.5}>
      <Typography component="h4" variant="subtitle1" fontWeight={700}>{(item?.kind && kinds[item.kind]) || "Обращение неизвестного типа"}{item?.id != null && ` №${item.id}`}</Typography>
      {item?.state === "OPEN" ? <Alert severity="info">Обращение открыто</Alert> : <Typography>{item?.state === "RESOLVED" ? "Обращение завершено" : "Состояние не указано"}</Typography>}
      <Typography variant="body2">Автор: {author?.login || (item?.openedBy != null ? `Участник #${item.openedBy}` : "Не указан")}</Typography>
      <Typography variant="body2">Создано: {date(item?.createdAt)}</Typography>
      <Typography sx={{ whiteSpace: "pre-wrap" }}>Причина: {item?.openingComment?.trim() || "Не указана"}</Typography>
      {telegram ? <Button component="a" href={telegram} target="_blank" rel="noopener noreferrer" sx={{ alignSelf: "flex-start", minHeight: 44 }}>Обсуждение в Telegram</Button> : <Typography variant="body2" color="text.secondary">Ссылка на обсуждение пока не указана</Typography>}
      {(item?.state === "RESOLVED" || item?.outcome) && <Stack spacing={1}>
        <Typography>Решение: {(item?.outcome && outcomes[item.outcome]) || "Не указано"}</Typography>
        <Typography sx={{ whiteSpace: "pre-wrap" }}>Комментарий решения: {item?.resolutionComment?.trim() || "Не указан"}</Typography>
        <Typography variant="body2">Дата решения: {date(item?.resolvedAt)}</Typography>
      </Stack>}
      {children}
    </Stack>
  </Paper>;
}

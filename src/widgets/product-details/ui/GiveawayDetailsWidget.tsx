"use client";

import Link from "next/link";
import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";
import { ImageMetadataFeedback, useImageMetadataQuery } from "@/entities/image";
import { GiveawayCountdown, getGiveawayTiming, parseGiveawayDate, usePublicGiveaway } from "@/entities/product";
import { formatDateTime, getImageUrl, getSafeTelegramUrl } from "@/shared/lib";
import { ImageGallery } from "@/shared/ui/image-gallery";
import { ImageFallback } from "@/shared/ui/image-fallback";
import { GiveawayDetailsSkeleton } from "./GiveawayDetailsSkeleton";

export function GiveawayDetailsWidget({ productId }: { productId: number }) {
  const query = usePublicGiveaway(productId);
  const data = query.data;
  const metadata = useImageMetadataQuery(data?.imageIds);
  const refresh = () => { void query.refetch(); };
  const retry = <Button sx={{ minHeight: 44 }} disabled={query.isFetching} onClick={refresh}>Обновить розыгрыш</Button>;
  const home = <Button component={Link} href="/" sx={{ minHeight: 44 }}>На главную</Button>;
  if (query.isPending) return <GiveawayDetailsSkeleton />;
  if (!data) return <Container sx={{ py: 3 }}>
    <Stack spacing={2} alignItems="flex-start">
      <Typography component="h1" variant="h4">{query.ended ? "Розыгрыш завершён" : query.isError ? "Не удалось загрузить розыгрыш" : "Розыгрыш недоступен"}</Typography>
      {query.isError && <Alert severity="error">Не удалось получить актуальные данные. Попробуйте ещё раз.</Alert>}
      <Stack direction="row" spacing={1}>{retry}{home}</Stack>
    </Stack>
  </Container>;

  const title = data.name?.trim() || "Розыгрыш";
  const telegram = getSafeTelegramUrl(data.telegramUrl);
  const { phase } = query.timing;
  const canOpenTelegram = !!telegram && query.isSuccess && !query.isFetching &&
    (phase === "scheduled" || (phase === "active" && data.status === "ACTIVE"));
  const images = (metadata.data ?? []).flatMap(image => {
    const previewSrc = getImageUrl(image, "medium");
    return previewSrc ? [{ previewSrc, originalSrc: getImageUrl(image, "original") ?? undefined, thumbnailSrc: getImageUrl(image, "thumbnail") ?? undefined }] : [];
  });
  const date = (label: string, value?: string | null) => <Typography>
    {label}: {parseGiveawayDate(value) !== null && value ? <time dateTime={value}>{formatDateTime(value)}</time> : "не указано"}
  </Typography>;
  return <Container sx={{ py: 3 }}>
    <Stack spacing={3} sx={{ overflowWrap: "anywhere", minWidth: 0 }}>
      <Typography component="h1" variant="h3" sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" } }}>{title}</Typography>
      {query.isError && <Alert severity="error" action={retry}>Не удалось обновить розыгрыш. Участие недоступно до успешного чтения.</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <ImageMetadataFeedback query={metadata} />
          {images.length ? <ImageGallery images={images} alt={title} imageSizes="(max-width: 899px) 100vw, 600px" />
            : <Box sx={{ aspectRatio: "4/3" }}><ImageFallback /></Box>}
        </Box>
        <Stack spacing={2} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <GiveawayCountdown timing={query.timing} />
          {date("Начало", data.startAt)}
          {date("Окончание", data.endAt)}
          <Typography variant="caption" color="text.secondary">Даты показаны в вашем часовом поясе.</Typography>
          <Typography>Число победителей: {data.winnersCount != null && data.winnersCount > 0 ? data.winnersCount : "не указано"}</Typography>
          {phase !== "ended" && (canOpenTelegram ? <Button
            component="a" href={telegram!} target="_blank" rel="noopener noreferrer"
            variant="contained" sx={{ minHeight: 44 }} onClick={event => {
              const current = getGiveawayTiming(data, Date.now()).phase;
              if (current === "ended" || current === "unavailable" || (current === "active" && data.status !== "ACTIVE")) {
                event.preventDefault(); refresh();
              }
            }}
          >{phase === "scheduled" ? "Розыгрыш в Telegram" : "Участвовать в Telegram"}</Button> : <Button disabled variant="contained" sx={{ minHeight: 44 }}>Участие пока недоступно</Button>)}
          {!telegram && phase !== "ended" && <Alert severity="warning">Ссылка на Telegram недоступна.</Alert>}
          {phase === "active" && data.status !== "ACTIVE" && <Alert severity="info">Ожидаем актуальный статус розыгрыша.</Alert>}
          {retry}
        </Stack>
      </Box>
      {[
        ["О розыгрыше", data.homeText],
        ["Описание приза", data.description],
        ["Правила участия", data.rules],
      ].map(([label, text]) => <Stack component="section" key={label} spacing={1}>
        <Typography component="h2" variant="h5">{label}</Typography>
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{text || "Информация не указана"}</Typography>
      </Stack>)}
      {home}
    </Stack>
  </Container>;
}

"use client";

import { Alert, Button, LinearProgress } from "@mui/material";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ImageMetadata } from "../model/types";

export function ImageMetadataFeedback({ query }: {
  query: UseQueryResult<ImageMetadata[]>;
}) {
  if (query.isLoading) return <LinearProgress aria-label="Загрузка изображений" />;
  if (!query.isError) return null;
  return <Alert severity="warning" action={
    <Button color="inherit" disabled={query.isFetching} sx={{ minHeight: 44 }}
      onClick={() => void query.refetch()}>Повторить загрузку изображений</Button>
  }>
    Изображения недоступны.
  </Alert>;
}

"use client";

import { Container, Skeleton, Stack } from "@mui/material";

export function GiveawayDetailsSkeleton() {
  return <Container sx={{ py: 3 }} aria-busy="true" aria-label="Загрузка розыгрыша">
    <Stack spacing={2}>
      <Skeleton variant="text" width="70%" height={56} />
      <Skeleton variant="rectangular" height={320} />
      <Skeleton variant="text" width="90%" height={80} />
    </Stack>
  </Container>;
}

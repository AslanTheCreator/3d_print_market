"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Stack } from "@mui/material";
import { ErrorState } from "@/shared/ui/states";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Route error boundary caught an error:", error);
  }, [error]);

  return (
    <ErrorState
      type="generic"
      title="Не удалось открыть страницу"
      description="Произошла непредвиденная ошибка при загрузке страницы. Попробуйте повторить попытку или вернуться на главную."
      onRetry={reset}
      retryText="Попробовать снова"
      actions={
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          width={{ xs: "100%", sm: "auto" }}
        >
          <Button
            component={Link}
            href="/"
            variant="outlined"
            size="large"
            sx={{ minWidth: { xs: "100%", sm: 200 }, textTransform: "none" }}
          >
            На главную
          </Button>
        </Stack>
      }
    />
  );
}

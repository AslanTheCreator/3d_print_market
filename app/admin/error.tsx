"use client";
import { RequestFeedback } from "@/shared/ui/request-feedback";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <RequestFeedback error={new Error("Не удалось открыть раздел админки")} retry={reset} />;
}

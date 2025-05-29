import SearchPageClient from "@/features/search/ui/SearchPageClient";
import { Suspense } from "react";

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <SearchPageClient />
    </Suspense>
  );
}

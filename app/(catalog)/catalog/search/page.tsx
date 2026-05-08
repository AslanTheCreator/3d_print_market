import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchProducts } from "@/widgets/search-products";

export const metadata: Metadata = {
  title: "Поиск",
  alternates: {
    canonical: "/catalog/search",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <SearchProducts />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import {
  SearchProducts,
  SearchProductsSkeleton,
} from "@/widgets/product-catalog";

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
    <Suspense fallback={<SearchProductsSkeleton />}>
      <SearchProducts />
    </Suspense>
  );
}

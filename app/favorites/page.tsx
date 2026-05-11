import type { Metadata } from "next";
import FavoritesPageClient from "./FavoritesPageClient";

export const metadata: Metadata = {
  title: "Избранное",
  alternates: {
    canonical: "/favorites",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function FavoritesPage() {
  return <FavoritesPageClient />;
}

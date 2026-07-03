import type { Metadata } from "next";
import { SITE_INFO } from "@/shared/config";
import { SellerPageClient } from "./SellerPageClient";

interface SellerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Продавец",
  description: `Публичная страница продавца на ${SITE_INFO.name}: информация о продавце и его товары.`,
};

export default async function SellerPage({ params }: SellerPageProps) {
  const { id } = await params;

  return <SellerPageClient sellerId={id} />;
}

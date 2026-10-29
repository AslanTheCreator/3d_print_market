import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePositiveSafeInteger } from "@/shared/lib";
import { GiveawayDetailsWidget } from "@/widgets/product-details";

export const metadata: Metadata = { title: "Розыгрыш" };

export default async function GiveawayPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const id = parsePositiveSafeInteger(productId);
  if (id === null) notFound();
  return <GiveawayDetailsWidget key={id} productId={id} />;
}

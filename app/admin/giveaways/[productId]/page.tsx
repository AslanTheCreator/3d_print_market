import { notFound } from "next/navigation";
import { parsePositiveSafeInteger } from "@/shared/lib";
import { AdminGiveawayPage } from "@/widgets/admin-products";
export default async function GiveawayPage({ params }: { params: Promise<{ productId: string }> }) {
  const id = parsePositiveSafeInteger((await params).productId);
  if (id === null) notFound();
  return <AdminGiveawayPage id={id} />;
}

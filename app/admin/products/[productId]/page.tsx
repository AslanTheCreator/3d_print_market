import { AdminProductPage } from "@/widgets/admin-products";
import { notFound } from "next/navigation";
import { parsePositiveSafeInteger } from "@/shared/lib";
export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const id = parsePositiveSafeInteger((await params).productId);
  if (id === null) notFound();
  return <AdminProductPage id={id} />;
}

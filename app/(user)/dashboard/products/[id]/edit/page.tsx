import { CreateProductForm } from "@/widgets/create-product-form";
import { notFound } from "next/navigation";
import { parsePositiveSafeInteger } from "@/shared/lib";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;
  if (parsePositiveSafeInteger(id) === null) notFound();

  return <CreateProductForm mode="edit" productId={id} />;
}

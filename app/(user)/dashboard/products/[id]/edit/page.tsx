import { CreateProductForm } from "@/widgets/create-product-form";

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;

  return <CreateProductForm mode="edit" productId={id} />;
}

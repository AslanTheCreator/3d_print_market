import { CreateProductForm } from "@/widgets/create-product-form";

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default function EditProductPage({ params }: EditProductPageProps) {
  return <CreateProductForm mode="edit" productId={params.id} />;
}

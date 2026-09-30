import { AdminProductPage } from "@/widgets/admin-products";
export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  return <AdminProductPage id={Number((await params).productId)} />;
}

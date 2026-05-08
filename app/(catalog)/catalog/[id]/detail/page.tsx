import { cache } from "react";
import type { Metadata } from "next";
import { productApi } from "@/entities/product/api";
import type { ProductDetail } from "@/shared/types";
import { ProductDetailsWidget } from "@/widgets/product-details";

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const getProductDetails = cache(async (id: string): Promise<ProductDetail> => {
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    throw new Error("Invalid product id");
  }

  return productApi.getProductById(productId);
});

export const generateMetadata = async ({
  params,
}: ProductDetailPageProps): Promise<Metadata> => {
  const { id } = await params;

  try {
    const product = await getProductDetails(id);
    const description = product.description?.trim();

    return {
      title: product.name,
      description: description || undefined,
      openGraph: {
        title: product.name,
        description: description || undefined,
        type: "website",
      },
    };
  } catch {
    return {
      title: "Товар не найден",
    };
  }
};

const getInitialProduct = async (
  id: string,
): Promise<{
  product: ProductDetail | undefined;
  hasError: boolean;
}> => {
  try {
    const product = await getProductDetails(id);

    return { product, hasError: false };
  } catch {
    return { product: undefined, hasError: true };
  }
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  const { product, hasError } = await getInitialProduct(id);

  return (
    <ProductDetailsWidget
      productId={id}
      initialProduct={product}
      initialError={hasError}
    />
  );
}

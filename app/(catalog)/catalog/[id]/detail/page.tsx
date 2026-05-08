import { cache } from "react";
import type { Metadata } from "next";
import { productApi } from "@/entities/product/api";
import { SITE_INFO } from "@/shared/config";
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

const getProductCanonicalPath = (id: string): string =>
  `/catalog/${id}/detail`;

const normalizeMetadataText = (
  value: string | undefined,
  maxLength = 160,
): string | undefined => {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
};

const getProductMetadataDescription = (product: ProductDetail): string =>
  normalizeMetadataText(product.description) ??
  `${product.name} в маркетплейсе ${SITE_INFO.name}`;

export const generateMetadata = async ({
  params,
}: ProductDetailPageProps): Promise<Metadata> => {
  const { id } = await params;
  const canonicalPath = getProductCanonicalPath(id);

  try {
    const product = await getProductDetails(id);
    const description = getProductMetadataDescription(product);

    return {
      title: product.name,
      description,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: product.name,
        description,
        url: canonicalPath,
        siteName: SITE_INFO.name,
        locale: "ru_RU",
        type: "website",
      },
    };
  } catch {
    return {
      title: "Товар не найден",
      alternates: {
        canonical: canonicalPath,
      },
      robots: {
        index: false,
        follow: false,
      },
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

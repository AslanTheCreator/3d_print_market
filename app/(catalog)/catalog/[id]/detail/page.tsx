import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productApi, ProductNotFoundError } from "@/entities/product/server";
import { parsePositiveSafeInteger } from "@/shared/lib";
import { SITE_INFO } from "@/shared/config";
import type { ProductDetail } from "@/entities/product";
import { ProductDetailsWidget } from "@/widgets/product-details";

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const getProductDetails = cache(async (id: string): Promise<ProductDetail> => {
  const productId = parsePositiveSafeInteger(id);

  if (productId === null) {
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

  if (parsePositiveSafeInteger(id) === null) {
    return { title: "Товар не найден", robots: { index: false, follow: false } };
  }

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
  } catch (error) {
    return {
      title: error instanceof ProductNotFoundError ? "Товар не найден" : "Товар временно недоступен",
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
  fetchedAt: number;
  isNotFound: boolean;
}> => {
  try {
    const product = await getProductDetails(id);

    return { product, hasError: false, isNotFound: false, fetchedAt: Date.now() };
  } catch (error) {
    return { product: undefined, hasError: true, isNotFound: error instanceof ProductNotFoundError, fetchedAt: Date.now() };
  }
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  if (parsePositiveSafeInteger(id) === null) notFound();
  const { product, hasError, fetchedAt, isNotFound } = await getInitialProduct(id);
  if (isNotFound) notFound();

  return (
    <ProductDetailsWidget
      productId={id}
      initialProduct={product}
      initialDataUpdatedAt={fetchedAt}
      initialError={hasError}
    />
  );
}

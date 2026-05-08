import type { Metadata } from "next";
import { productApi } from "@/entities/product/api";
import { SITE_INFO } from "@/shared/config";
import type { Product } from "@/shared/types";
import { HomeProducts } from "@/widgets/home-products";

export const dynamic = "force-dynamic";

const HOME_PRODUCTS_PAGE_SIZE = 18;
const HOME_TITLE = `${SITE_INFO.name} - маркетплейс коллекционных фигурок и 3D-печати`;
const HOME_DESCRIPTION = SITE_INFO.description;

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
    siteName: SITE_INFO.name,
    locale: "ru_RU",
    type: "website",
  },
};

const getInitialProducts = async (): Promise<{
  products: Product[];
  hasError: boolean;
  fetchedAt: number;
}> => {
  try {
    const products = await productApi.getProducts({
      size: HOME_PRODUCTS_PAGE_SIZE,
      sortBy: "DATE_DESC",
    });

    return { products, hasError: false, fetchedAt: Date.now() };
  } catch {
    return { products: [], hasError: true, fetchedAt: Date.now() };
  }
};

export default async function HomePage() {
  const { products, hasError, fetchedAt } = await getInitialProducts();

  return (
    <HomeProducts
      initialProducts={products}
      initialDataUpdatedAt={fetchedAt}
      initialError={hasError}
      pageSize={HOME_PRODUCTS_PAGE_SIZE}
    />
  );
}

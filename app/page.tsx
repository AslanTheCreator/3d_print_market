import { productApi } from "@/entities/product/api";
import type { Product } from "@/shared/types";
import { HomeProducts } from "@/widgets/home-products";

export const dynamic = "force-dynamic";

const HOME_PRODUCTS_PAGE_SIZE = 18;

const getInitialProducts = async (): Promise<{
  products: Product[];
  hasError: boolean;
}> => {
  try {
    const products = await productApi.getProducts({
      size: HOME_PRODUCTS_PAGE_SIZE,
      sortBy: "DATE_DESC",
    });

    return { products, hasError: false };
  } catch {
    return { products: [], hasError: true };
  }
};

export default async function HomePage() {
  const { products, hasError } = await getInitialProducts();

  return (
    <HomeProducts
      initialProducts={products}
      initialError={hasError}
      pageSize={HOME_PRODUCTS_PAGE_SIZE}
    />
  );
}

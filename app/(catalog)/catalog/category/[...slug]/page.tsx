import { cache } from "react";
import type { Metadata } from "next";
import type { CategoryPath } from "@/entities/category";
import { categoryApi } from "@/entities/category/api";
import { getCategoryPathFromSlugs } from "@/entities/category/lib";
import { productApi } from "@/entities/product/api";
import { isAdultCategoryPath } from "@/features/age-verification/model";
import type { Product } from "@/shared/types";
import { CategoryProducts } from "@/widgets/category-products";

interface CategoryPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export const dynamic = "force-dynamic";

const CATEGORY_PRODUCTS_PAGE_SIZE = 20;

const getSlugKey = (slugs: string[]): string => slugs.join("/");

const getCategoryPath = cache(
  async (slugKey: string): Promise<CategoryPath | null> => {
    const slugs = slugKey.split("/").filter(Boolean);

    try {
      const categories = await categoryApi.getCategories();

      return getCategoryPathFromSlugs(slugs, categories);
    } catch {
      return getCategoryPathFromSlugs(slugs);
    }
  },
);

const getInitialProducts = async (
  categoryPath: CategoryPath | null,
): Promise<{
  products: Product[];
  hasError: boolean;
}> => {
  if (!categoryPath || isAdultCategoryPath(categoryPath)) {
    return { products: [], hasError: false };
  }

  try {
    const products = await productApi.getProducts({
      size: CATEGORY_PRODUCTS_PAGE_SIZE,
      filters: {
        categoryId: categoryPath.categoryId,
      },
      sortBy: "DATE_DESC",
    });

    return { products, hasError: false };
  } catch {
    return { products: [], hasError: true };
  }
};

export const generateMetadata = async ({
  params,
}: CategoryPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const categoryPath = await getCategoryPath(getSlugKey(slug));

  if (!categoryPath) {
    return {
      title: "Категория не найдена",
    };
  }

  return {
    title: categoryPath.title,
    description: `${categoryPath.title} в каталоге Figurzilla`,
    openGraph: {
      title: categoryPath.title,
      description: `${categoryPath.title} в каталоге Figurzilla`,
      type: "website",
    },
  };
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categoryPath = await getCategoryPath(getSlugKey(slug));
  const { products, hasError } = await getInitialProducts(categoryPath);

  return (
    <CategoryProducts
      categoryPath={categoryPath}
      initialProducts={products}
      initialError={hasError}
      pageSize={CATEGORY_PRODUCTS_PAGE_SIZE}
    />
  );
}

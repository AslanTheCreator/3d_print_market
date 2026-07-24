import type { MetadataRoute } from "next";
import { categoryApi, getCategorySlug } from "@/entities/category/server";
import { productApi } from "@/entities/product/server";
import { isAdultCategoryName } from "@/features/age-verification/server";
import { SITE_INFO } from "@/shared/config";
import type { CategoryModel } from "@/entities/category";

type SitemapEntry = MetadataRoute.Sitemap[number];

export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: SitemapEntry["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/about", changeFrequency: "weekly", priority: 0.7 },
  { path: "/contacts", changeFrequency: "weekly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.4 },
  { path: "/user-agreement", changeFrequency: "monthly", priority: 0.4 },
];

const PRODUCT_SITEMAP_PAGE_SIZE = 100;
const MAX_PRODUCT_SITEMAP_ITEMS = 1000;

const getAbsoluteUrl = (path: string): string => `${SITE_INFO.url}${path}`;

const getSafeDate = (value: string | undefined, fallback: Date): Date => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? fallback : date;
};

const getStaticEntries = (lastModified: Date): MetadataRoute.Sitemap =>
  STATIC_ROUTES.map((route) => ({
    url: getAbsoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

const getProductEntries = async (
  fallbackLastModified: Date,
): Promise<MetadataRoute.Sitemap> => {
  const entries: MetadataRoute.Sitemap = [];
  let lastCreatedAt: string | undefined;
  let lastPrice: number | undefined;
  let lastId: number | undefined;

  try {
    while (entries.length < MAX_PRODUCT_SITEMAP_ITEMS) {
      const products = await productApi.getProductSitemapItems({
        size: PRODUCT_SITEMAP_PAGE_SIZE,
        lastCreatedAt,
        lastPrice,
        lastId,
        sortBy: "DATE_DESC",
      });

      entries.push(
        ...products.map((product) => ({
          url: getAbsoluteUrl(`/catalog/${product.id}/detail`),
          lastModified: getSafeDate(product.createdAt, fallbackLastModified),
          changeFrequency: "daily" as const,
          priority: 0.8,
        })),
      );

      if (products.length < PRODUCT_SITEMAP_PAGE_SIZE) {
        break;
      }

      const lastProduct = products[products.length - 1];
      lastCreatedAt = lastProduct.createdAt;
      lastPrice = lastProduct.price;
      lastId = lastProduct.id;
    }
  } catch {
    return entries;
  }

  return entries;
};

const getCategoryPaths = (
  categories: CategoryModel[],
  parentSlugs: string[] = [],
  hasAdultParent = false,
): string[] => {
  return categories.flatMap((category) => {
    const currentSlug = getCategorySlug(category);
    const currentSlugs = [...parentSlugs, currentSlug];
    const isAdultBranch =
      hasAdultParent || isAdultCategoryName(category.name);

    if (isAdultBranch) {
      return [];
    }

    return [
      `/catalog/category/${currentSlugs.join("/")}`,
      ...getCategoryPaths(category.childs ?? [], currentSlugs, isAdultBranch),
    ];
  });
};

const getCategoryEntries = async (
  lastModified: Date,
): Promise<MetadataRoute.Sitemap> => {
  try {
    const categories = await categoryApi.getCategories();

    return getCategoryPaths(categories).map((path) => ({
      url: getAbsoluteUrl(path),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    return [];
  }
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const [productEntries, categoryEntries] = await Promise.all([
    getProductEntries(lastModified),
    getCategoryEntries(lastModified),
  ]);

  return [
    ...getStaticEntries(lastModified),
    ...categoryEntries,
    ...productEntries,
  ];
}

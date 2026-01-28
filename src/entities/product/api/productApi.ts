import {
  Product,
  ProductDetail,
  ProductCreateModel,
  ProductFilter,
  SortBy,
} from "../model/types";
import { imageApi } from "@/entities/image";
import { fetchProductsWithImages } from "@/shared/api";
import { publicClient, authClient } from "@/shared/api";

const API_URL_PRODUCT = `/product`;
const API_URL = `/products`;

export const productApi = {
  getProducts: async (
    size: number,
    filters?: ProductFilter,
    lastCreatedAt?: string,
    lastPrice?: number,
    lastId?: number,
    sortBy: SortBy = "DATE_DESC",
  ): Promise<Product[]> => {
    return fetchProductsWithImages(
      publicClient,
      `${API_URL}/find`,
      size,
      filters,
      lastCreatedAt,
      lastPrice,
      lastId,
      sortBy,
      "Ошибка при загрузке карточек товаров",
    );
  },

  getProductById: async (id: number): Promise<ProductDetail> => {
    const { data } = await publicClient.get<ProductDetail>(
      `${API_URL_PRODUCT}/${id}`,
    );

    const images = await imageApi.getImages(data.imageIds);
    return { ...data, image: images };
  },

  getUserProducts: async (
    size: number,
    filters?: ProductFilter,
    lastCreatedAt?: string,
    lastPrice?: number,
    lastId?: number,
    sortBy: SortBy = "DATE_DESC",
  ): Promise<Product[]> => {
    return fetchProductsWithImages(
      authClient,
      `${API_URL}/my`,
      size,
      filters,
      lastCreatedAt,
      lastPrice,
      lastId,
      sortBy,
      "Ошибка при загрузке карточек товаров",
    );
  },

  createProduct: async (data: ProductCreateModel) => {
    await authClient.post(`${API_URL}`, data);
  },

  extendProductExpiration: async (productId: number) => {
    await authClient.post(`${API_URL_PRODUCT}/extend/${productId}`);
  },
};

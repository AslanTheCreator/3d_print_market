import {
  ProductCardModel,
  ProductDetailsModel,
  ProductCreateModel,
  ProductFilter,
  SortBy,
} from "../model/types";
import { imageApi } from "@/entities/image/api/imageApi";
import { errorHandler } from "@/shared/lib";
import { fetchProductsWithImages } from "@/shared/api";
import { publicApi, authApi } from "@/shared/api";

const API_URL_PRODUCT = `/product`;
const API_URL = `/products`;

export const productApi = {
  getProducts: async (
    size: number,
    filters?: ProductFilter,
    lastCreatedAt?: string,
    lastPrice?: number,
    lastId?: number,
    sortBy: SortBy = "DATE_DESC"
  ): Promise<ProductCardModel[]> => {
    return fetchProductsWithImages(
      publicApi,
      `${API_URL}/find`,
      size,
      filters,
      lastCreatedAt,
      lastPrice,
      lastId,
      sortBy,
      "Ошибка при загрузке карточек товаров"
    );
  },

  getProductById: async (id: string): Promise<ProductDetailsModel> => {
    try {
      const { data } = await publicApi.get<ProductDetailsModel>(
        `${API_URL_PRODUCT}/${id}`
      );

      if (!data || !data.imageIds) {
        throw new Error("Некорректные данные товара");
      }

      const images = await imageApi.getImages(data.imageIds);
      return { ...data, image: images };
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        `Ошибка при получении данных о товаре с ID: ${id}`
      );
    }
  },

  createProduct: async (data: ProductCreateModel) => {
    try {
      await authApi.post(`${API_URL}/`, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании товара");
    }
  },
};

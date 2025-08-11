import axios from "axios";
import {
  ProductCardModel,
  ProductDetailsModel,
  ProductCreateModel,
  ProductFilter,
  SortBy,
} from "../model/types";
import config from "@/shared/config/api";
import { imageApi } from "@/entities/image/api/imageApi";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { fetchProductsWithImages } from "@/shared/api/common/productDataFetcher";

const API_URL = `${config.apiBaseUrl}/products/find`;

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
      axios,
      API_URL,
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
      const { data } = await axios.get<ProductDetailsModel>(
        `${config.apiBaseUrl}/product/${id}`
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
      const authenticatedAxios = createAuthenticatedAxiosInstance();
      console.log(data);
      await authenticatedAxios.post(`${config.apiBaseUrl}/products/`, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании товара");
    }
  },
};

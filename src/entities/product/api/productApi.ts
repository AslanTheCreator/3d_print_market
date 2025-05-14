import axios from "axios";
import {
  ProductResponseModel,
  ProductCardModel,
  ProductDetailsModel,
  ProductCreateModel,
  ProductFilter,
  ProductRequestModel,
} from "../model/types";
import config from "@/shared/config/api";
import { imageApi } from "@/entities/image/api/imageApi";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";

const API_URL = `${config.apiBaseUrl}/products/find`;

const fetchImages = async (imageId: number | undefined) => {
  return imageId !== undefined ? await imageApi.getImages(imageId) : [];
};

export const productApi = {
  getProducts: async (
    page: number,
    size: number,
    filters?: ProductFilter
  ): Promise<ProductCardModel[]> => {
    try {
      const requestData: ProductRequestModel = {
        pageable: { size, page },
        ...filters,
      };

      const { data } = await axios.post<ProductResponseModel>(
        API_URL,
        requestData
      );

      if (!Array.isArray(data.content)) {
        console.error("Ошибка: сервер вернул некорректный формат данных", data);
        throw new Error("Некорректный формат данных от сервера");
      }

      return Promise.all(
        data.content.map(async (card) => ({
          ...card,
          image: await fetchImages(card.imageId),
        }))
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузки карточек товаров"
      );
    }
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
      await authenticatedAxios.post(`${config.apiBaseUrl}/product`, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании товара");
    }
  },
};

import axios from "axios";
import {
  ProductResponseModel,
  ProductCardModel,
  ProductDetailsModel,
  ProductCreateModel,
} from "../model/types";
import config from "@/shared/config/api";
import { imageApi } from "@/entities/image/api/imageApi";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";

const API_URL = `${config.apiBaseUrl}/products/find`;

export const productApi = {
  async getProducts(page: number, size: number): Promise<ProductCardModel[]> {
    try {
      const { data } = await axios.post<ProductResponseModel>(
        API_URL,
        {
          pageable: {
            size,
            page,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const cards = data.content;
      if (!Array.isArray(cards)) {
        console.error("Ошибка: сервер вернул некорректный формат данных", data);
        throw new Error("Некорректный формат данных от сервера");
      }

      return Promise.all(
        cards.map(async (card) => {
          const images =
            card.imageId !== undefined
              ? await imageApi.getImages(card.imageId)
              : [];
          return { ...card, image: images };
        })
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузки карточек товаров"
      );
    }
  },
  async getProductById(id: string): Promise<ProductDetailsModel> {
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
  async createProduct(data: ProductCreateModel) {
    try {
      const authenticatedAxios = createAuthenticatedAxiosInstance();
      const response = await authenticatedAxios.post(
        `${config.apiBaseUrl}/product`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      //console.log(response.data);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании товара");
    }
  },
};

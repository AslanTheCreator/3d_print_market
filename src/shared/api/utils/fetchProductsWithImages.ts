import {
  ProductCardModel,
  ProductFilter,
  ProductRequestModel,
  SortBy,
} from "@/entities/product/model/types";
import { imageApi } from "@/entities/image/api/imageApi";
import { errorHandler } from "@/shared/lib";
import { AxiosInstance } from "axios";

export const fetchProductsWithImages = async (
  axiosInstance: AxiosInstance,
  url: string,
  size: number,
  filters?: ProductFilter,
  lastCreatedAt?: string,
  lastPrice?: number,
  lastId?: number,
  sortBy: SortBy = "DATE_DESC",
  errorMessage: string = "Ошибка при загрузке товаров"
): Promise<ProductCardModel[]> => {
  try {
    const requestData: ProductRequestModel = {
      pageable: {
        size,
        ...(lastCreatedAt && { lastCreatedAt }),
        ...(lastPrice && { lastPrice }),
        ...(lastId && { lastId }),
        sortBy,
      },
      ...filters,
    };

    const { data } = await axiosInstance.post<ProductCardModel[]>(
      url,
      requestData
    );

    if (!Array.isArray(data)) {
      console.error("Ошибка: сервер вернул некорректный формат данных", data);
      throw new Error("Некорректный формат данных от сервера");
    }

    return Promise.all(
      data.map(async (product) => {
        const images =
          product.imageId !== undefined
            ? await imageApi.getImages(product.imageId)
            : [];
        return { ...product, image: images };
      })
    );
  } catch (error) {
    throw errorHandler.handleAxiosError(error, errorMessage);
  }
};

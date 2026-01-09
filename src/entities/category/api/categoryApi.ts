import { errorHandler } from "@/shared/lib";
import { publicClient } from "@/shared/api";
import { CategoryModel } from "../model/types";

const API_URL = `/categories`;

export const categoryApi = {
  async getCategories() {
    try {
      const { data } = await publicClient.get<CategoryModel[]>(API_URL);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузке категорий"
      );
    }
  },
};

import { errorHandler } from "@/shared/lib";
import { publicApi } from "@/shared/api";
import { CategoryModel } from "../model/types";

const API_URL = `/categories`;

export const categoryApi = {
  async getCategories() {
    try {
      const { data } = await publicApi.get<CategoryModel[]>(API_URL);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузке категорий"
      );
    }
  },
};

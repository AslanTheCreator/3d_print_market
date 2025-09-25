import { errorHandler } from "@/shared/lib";
import { CategoryModel } from "../model/types";
import { publicApi } from "@/shared/api";

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

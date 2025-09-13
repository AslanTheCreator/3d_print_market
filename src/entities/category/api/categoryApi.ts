import { errorHandler } from "@/shared/lib/errorHandler";
import axios from "axios";
import { CategoryModel } from "../model/types";

import "@/shared/config/axiosInterceptor";

export const categoryApi = {
  async getCategories() {
    try {
      const { data } = await axios.get<CategoryModel[]>(`/categories`);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузке категорий"
      );
    }
  },
};

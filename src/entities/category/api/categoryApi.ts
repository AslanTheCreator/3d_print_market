import config from "@/shared/config/api";
import { errorHandler } from "@/shared/lib/errorHandler";
import axios from "axios";
import { CategoryModel } from "../model/types";

export const categoryApi = {
  async getCategories() {
    try {
      const { data } = await axios.get<CategoryModel[]>(
        `${config.apiBaseUrl}/categories`
      );
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузке категорий"
      );
    }
  },
};

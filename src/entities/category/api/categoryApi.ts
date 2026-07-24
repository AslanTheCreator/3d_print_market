import { publicClient } from "@/shared/api";
import { CategoryModel } from "../model/types";

const API_URL = `/categories`;

export const categoryApi = {
  async getCategories() {
    const { data } = await publicClient.get<CategoryModel[]>(API_URL);
    return data;
  },
};

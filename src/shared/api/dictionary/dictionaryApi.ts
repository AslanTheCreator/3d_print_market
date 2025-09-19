import axios from "axios";
import { DictionaryItem } from "./types";
import { errorHandler } from "@/shared/lib/error-handler";

import "@/shared/config/axiosInterceptor";

const API_URL = `/dictionary`;

export const dictionaryApi = {
  getDictionary: async (type: string): Promise<DictionaryItem[]> => {
    try {
      const { data } = await axios.get<DictionaryItem[]>(
        `${API_URL}?type=${type}`
      );
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при загрузке словаря");
    }
  },
};

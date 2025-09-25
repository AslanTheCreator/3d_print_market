import { publicApi } from "@/shared/api";
import { DictionaryItem } from "../model/types";
import { errorHandler } from "@/shared/lib";

const API_URL = `/dictionary`;

export const dictionaryApi = {
  getDictionary: async (type: string): Promise<DictionaryItem[]> => {
    try {
      const { data } = await publicApi.get<DictionaryItem[]>(
        `${API_URL}?type=${type}`
      );
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при загрузке словаря");
    }
  },
};

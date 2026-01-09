import { errorHandler } from "@/shared/lib";
import { publicClient } from "@/shared/api";
import { DictionaryItem } from "../model/types";

const API_URL = `/dictionary`;

export const dictionaryApi = {
  getDictionary: async (type: string): Promise<DictionaryItem[]> => {
    try {
      const { data } = await publicClient.get<DictionaryItem[]>(
        `${API_URL}?type=${type}`
      );
      return data ?? [];
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при загрузке словаря");
    }
  },
};

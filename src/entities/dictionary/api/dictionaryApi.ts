import { publicClient } from "@/shared/api";
import type { DictionaryItem, DictionaryType } from "../model/types";

const API_URL = `/dictionary`;

export const dictionaryApi = {
  getDictionary: async (type: DictionaryType): Promise<DictionaryItem[]> => {
    const { data } = await publicClient.get<DictionaryItem[]>(
      `${API_URL}?type=${type}`,
    );
    return data ?? [];
  },
};

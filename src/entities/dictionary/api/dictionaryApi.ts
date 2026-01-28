import { publicClient } from "@/shared/api";
import { DictionaryItem } from "../model/types";

const API_URL = `/dictionary`;

export const dictionaryApi = {
  getDictionary: async (type: string): Promise<DictionaryItem[]> => {
    const { data } = await publicClient.get<DictionaryItem[]>(
      `${API_URL}?type=${type}`,
    );
    return data ?? [];
  },
};

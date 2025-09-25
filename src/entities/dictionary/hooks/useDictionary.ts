import { useQuery } from "@tanstack/react-query";
import { dictionaryKeys } from "../model/queries";
import { dictionaryApi } from "../api/dictionaryApi";

export const useDictionary = (type: string) => {
  return useQuery({
    queryKey: dictionaryKeys.type(type),
    queryFn: () => dictionaryApi.getDictionary(type),
    staleTime: 60 * 60 * 1000, // 1 час
  });
};

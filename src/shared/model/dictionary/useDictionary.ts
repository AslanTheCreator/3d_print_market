import { useQuery } from "@tanstack/react-query";
import { dictionaryApi } from "@/shared/api/dictionary/dictionaryApi";
import { dictionaryKeys } from "@/shared/api/dictionary/queryKeys";

export const useDictionary = (type: string) => {
  return useQuery({
    queryKey: dictionaryKeys.type(type),
    queryFn: () => dictionaryApi.getDictionary(type),
    staleTime: 60 * 60 * 1000, // 1 час
  });
};
